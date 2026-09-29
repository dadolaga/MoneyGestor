[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$composeFile = Join-Path $PSScriptRoot 'compose.yaml'
$project = 'mgphase4' + [Guid]::NewGuid().ToString('N').Substring(0, 10)
$dockerConfig = Join-Path $env:TEMP ($project + '-docker-config')
[IO.Directory]::CreateDirectory($dockerConfig) | Out-Null
[IO.File]::WriteAllText((Join-Path $dockerConfig 'config.json'), '{}')
$env:DOCKER_CONFIG = $dockerConfig

function Invoke-Compose {
    param([Parameter(Mandatory)][string[]] $ComposeArgs)
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $composeOutput = @(& docker compose --project-name $project --file $composeFile @ComposeArgs 2>&1)
        $composeExitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($composeExitCode -ne 0) {
        $composeOutput | ForEach-Object { Write-Output $_ }
        throw "docker compose $($ComposeArgs -join ' ') failed with exit $composeExitCode."
    }
    $composeOutput | ForEach-Object { Write-Output $_ }
}

function Wait-Api {
    param([Parameter(Mandatory)][string] $Service, [int] $TimeoutSeconds = 90)
    $portOutput = @(& docker compose --project-name $project --file $composeFile port $Service 8080 2>&1)
    if ($LASTEXITCODE -ne 0) { throw "Could not resolve published port for ${Service}: $($portOutput -join ' ')" }
    $match = [regex]::Match(($portOutput -join "`n"), '127\.0\.0\.1:(\d+)')
    if (-not $match.Success) { throw "Could not parse published port for $Service." }
    $uri = 'http://127.0.0.1:' + $match.Groups[1].Value + '/swagger/v1/swagger.json'
    $timer = [Diagnostics.Stopwatch]::StartNew()
    $lastError = $null
    while ($timer.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $uri -TimeoutSec 4
            if ($response.StatusCode -eq 200 -and $response.Content -match '"openapi"') {
                $timer.Stop()
                return [ordered]@{ service = $Service; url = $uri; status = $response.StatusCode; startupSeconds = [Math]::Round($timer.Elapsed.TotalSeconds, 3) }
            }
            $lastError = "HTTP $($response.StatusCode) or unexpected OpenAPI body"
        } catch { $lastError = $_.Exception.Message }
        Start-Sleep -Seconds 2
    }
    throw "API $Service did not become healthy at $uri within $TimeoutSeconds seconds. Last error: $lastError"
}

$results = [ordered]@{}
$started = [Diagnostics.Stopwatch]::StartNew()
try {
    Invoke-Compose @('build', 'tools') | Out-Null
    Invoke-Compose @('up', '--detach', 'mysql') | Out-Null
    Invoke-Compose @('up', '--detach', 'app-init') | Out-Null

    $initTimer = [Diagnostics.Stopwatch]::StartNew()
    $initContainer = $project + '-app-init-1'
    $mysqlContainer = $project + '-mysql-1'
    $initDone = $false
    $requiredTablesSql = "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='mg_drill_fixture' AND TABLE_NAME IN ('AspNetRoleClaims','AspNetRoles','AspNetUserClaims','AspNetUserLogins','AspNetUserRoles','AspNetUserTokens','AspNetUsers','__EFMigrationsHistory','color','login','transaction','transaction_type','user','wallet');"
    while ($initTimer.Elapsed.TotalSeconds -lt 120) {
        $stateOutput = @(& docker inspect --format '{{.State.Status}} {{.State.ExitCode}}' $initContainer 2>$null)
        if ($LASTEXITCODE -ne 0) { throw 'Could not read app-init container state.' }
        $state = [string]($stateOutput -join ' ')
        if ($state -match '^exited (\d+)$') {
            & docker compose --project-name $project --file $composeFile logs app-init
            throw "Disposable database migration/seed process exited with code $($Matches[1])."
        }
        $tableCount = @(& docker exec -e MYSQL_PWD=mg-phase4-test-only $mysqlContainer mysql --user=moneygestor_ops --batch --skip-column-names --execute=$requiredTablesSql 2>$null)
        if ($LASTEXITCODE -eq 0 -and ([string]($tableCount -join '')).Trim() -eq '14') {
            $seedSql = "SELECT IF((SELECT COUNT(*) FROM mg_drill_fixture.color)>0 AND (SELECT COUNT(*) FROM mg_drill_fixture.transaction_type)>0,1,0);"
            $seeded = @(& docker exec -e MYSQL_PWD=mg-phase4-test-only $mysqlContainer mysql --user=moneygestor_ops --batch --skip-column-names --execute=$seedSql 2>$null)
            if ($LASTEXITCODE -eq 0 -and ([string]($seeded -join '')).Trim() -eq '1') { $initDone = $true; break }
        }
        Start-Sleep -Seconds 2
    }
    if (-not $initDone) { throw 'Database bootstrap did not finish within 120 seconds.' }
    $initTimer.Stop()
    $results.databaseBootstrapSeconds = [Math]::Round($initTimer.Elapsed.TotalSeconds, 3)
    Invoke-Compose @('stop', 'app-init') | Out-Null

    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $roundTripOutput = @(& docker compose --project-name $project --file $composeFile run --rm tools pwsh -NoLogo -NoProfile -File /workspace/ops/database/tests/RecoveryRoundTrip.ps1 2>&1)
        $roundTripExitCode = $LASTEXITCODE
    } finally { $ErrorActionPreference = $previousPreference }
    if ($roundTripExitCode -ne 0) { $roundTripOutput | ForEach-Object { Write-Output $_ }; throw 'Database backup/restore drill failed.' }
    $roundTripJson = [string]($roundTripOutput | Where-Object { $_ -match '^\s*\{"result"' } | Select-Object -Last 1)
    if (-not $roundTripJson) { $roundTripOutput | ForEach-Object { Write-Output $_ }; throw 'Database round-trip summary JSON was not emitted.' }
    $results.databaseRoundTrip = $roundTripJson | ConvertFrom-Json

    Invoke-Compose @('up', '--detach', 'app-source') | Out-Null
    $results.sourceApi = Wait-Api 'app-source'
    Invoke-Compose @('stop', 'app-source') | Out-Null

    Invoke-Compose @('up', '--detach', 'app-stage') | Out-Null
    $results.stagedApiCutover = Wait-Api 'app-stage'
    Invoke-Compose @('stop', 'app-stage') | Out-Null

    Invoke-Compose @('up', '--detach', 'app-source') | Out-Null
    $results.rollbackToSource = Wait-Api 'app-source'
    Invoke-Compose @('stop', 'app-source') | Out-Null

    $started.Stop()
    $results.result = 'BAK-41-42-43-isolated-recovery-and-rollback-passed'
    $results.composeProject = $project
    $results.totalDurationSeconds = [Math]::Round($started.Elapsed.TotalSeconds, 3)
    $results.completedUtc = [DateTimeOffset]::UtcNow.ToString('O')
    ConvertTo-Json -InputObject $results -Depth 8
} finally {
    # Guard cleanup by requiring every container to carry this unique Compose project label.
    $ids = @(& docker ps --all --quiet --filter "label=com.docker.compose.project=$project" 2>$null)
    if ($ids.Count -gt 0) {
        $labelRows = @(& docker inspect --format '{{json .Config.Labels}}' $ids 2>$null)
        if ($LASTEXITCODE -ne 0) {
            throw 'Cleanup guard rejected containers outside the generated recovery-test project.'
        }
        foreach ($labelRow in $labelRows) {
            $labels = $labelRow | ConvertFrom-Json
            if ($labels.'com.docker.compose.project' -ne $project) {
                throw 'Cleanup guard rejected containers outside the generated recovery-test project.'
            }
        }
        Invoke-Compose @('down', '--remove-orphans') | Out-Null
    }
    [Environment]::SetEnvironmentVariable('DOCKER_CONFIG', $null, 'Process')
    if (Test-Path -LiteralPath $dockerConfig) { Remove-Item -LiteralPath $dockerConfig -Recurse -Force }
}
