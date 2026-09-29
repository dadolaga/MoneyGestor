$ErrorActionPreference = 'Stop'
$repoRoot = '/workspace'
$scriptRoot = Join-Path $repoRoot 'ops/database'
Import-Module (Join-Path $scriptRoot 'MoneyGestor.DatabaseTools.psm1') -Force
Assert-MySqlTooling
if (-not (Get-Command mysql_config_editor -ErrorAction SilentlyContinue)) {
    throw 'mysql_config_editor is required by the isolated recovery harness.'
}

$loginPath = 'client'
$mysqlDefaults = Join-Path $HOME '.my.cnf'
[IO.File]::WriteAllText($mysqlDefaults, "[client]`nuser=root`nhost=mysql`nport=3306`n[mysql]`nbatch`nraw`nskip-column-names`n", [Text.UTF8Encoding]::new($false))
& chmod 600 $mysqlDefaults
if ($LASTEXITCODE -ne 0) { throw 'Could not secure the disposable MySQL defaults file.' }
& mysql_config_editor set --login-path=$loginPath --host=mysql --port=3306 --user=root
if ($LASTEXITCODE -ne 0) { throw 'Could not configure the disposable MySQL login-path.' }
$env:MYSQL_TEST_LOGIN_FILE = Join-Path $HOME '.mylogin.cnf'
$loginPathContents = @(& mysql_config_editor print --login-path=$loginPath)
Write-Output ('checkpoint=mysql-login-path-created: ' + ($loginPathContents -join ' '))
$databaseIdentity = Invoke-MgSql -LoginPath $loginPath -Server mysql -Port 3306 -Sql 'SELECT CURRENT_USER();'
if ($databaseIdentity -notmatch '^root@') { throw "Unexpected disposable MySQL identity '$databaseIdentity'." }
Write-Output 'checkpoint=mysql-login-path-verified'

$directDumpPath = '/tmp/direct-mg-drill.sql'
$dumpClientVersion = & mysqldump --version
Write-Output ('checkpoint=mysql-dump-client: ' + [string]$dumpClientVersion)
$directDumpArgs = @('--host=mysql', '--port=3306', '--user=root', '--single-transaction', '--quick', '--skip-lock-tables', '--routines', '--events', '--triggers', '--hex-blob', '--no-tablespaces', '--set-gtid-purged=OFF', '--result-file', $directDumpPath, 'mg_drill_fixture')
$directDumpOutput = @(& mysqldump @directDumpArgs 2>&1)
if ($LASTEXITCODE -ne 0) {
    $directDumpLength = if (Test-Path -LiteralPath $directDumpPath) { (Get-Item -LiteralPath $directDumpPath).Length } else { 0 }
    $directDumpDiagnostic = @($directDumpOutput | ForEach-Object { ($_ | Out-String).Trim() }) -join ' | '
    throw "Direct mysqldump failed ($LASTEXITCODE), outputBytes=$directDumpLength, outputLines=$($directDumpOutput.Count): $directDumpDiagnostic"
}
Write-Output 'checkpoint=direct-dump-succeeded'

$outputDirectory = '/tmp/mg-phase4-backups'
[IO.Directory]::CreateDirectory($outputDirectory) | Out-Null
$backupTimer = [Diagnostics.Stopwatch]::StartNew()
$backupOutput = @(& (Join-Path $scriptRoot 'New-MoneyGestorBackup.ps1') `
    -Database mg_drill_fixture -LoginPath $loginPath -Server mysql -Port 3306 -OutputDirectory $outputDirectory)
$backupTimer.Stop()
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'BAK-41 backup command failed.' }
$backupPath = [string]($backupOutput | Where-Object { $_ -match '\.mgbak$' } | Select-Object -Last 1)
if (-not $backupPath) { throw 'Backup command did not return an artifact directory.' }
Write-Output 'checkpoint=backup-created'
$manifestPath = Join-Path $backupPath 'manifest.json'
$dumpPath = Join-Path $backupPath 'database.sql'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ((Get-FileHash -LiteralPath $dumpPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $manifest.dumpSha256) {
    throw 'BAK-41 output checksum did not verify.'
}
Write-Output 'checkpoint=backup-hash-verified'

$restoreTimer = [Diagnostics.Stopwatch]::StartNew()
& (Join-Path $scriptRoot 'Restore-MoneyGestorToStaging.ps1') `
    -BackupPath $backupPath -StagingDatabase mg_restore_bak42test -LoginPath $loginPath -Server mysql -Port 3306 | Out-Null
$restoreTimer.Stop()
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'BAK-42 restore command failed.' }
Write-Output 'checkpoint=staging-restore-validated'

$sourceColorCount = [Int64](Invoke-MgSql -LoginPath $loginPath -Server mysql -Port 3306 -Sql 'SELECT COUNT(*) FROM `mg_drill_fixture`.`color`;')
$stagedColorCount = [Int64](Invoke-MgSql -LoginPath $loginPath -Server mysql -Port 3306 -Sql 'SELECT COUNT(*) FROM `mg_restore_bak42test`.`color`;')
$sourceTypeCount = [Int64](Invoke-MgSql -LoginPath $loginPath -Server mysql -Port 3306 -Sql 'SELECT COUNT(*) FROM `mg_drill_fixture`.`transaction_type`;')
$stagedTypeCount = [Int64](Invoke-MgSql -LoginPath $loginPath -Server mysql -Port 3306 -Sql 'SELECT COUNT(*) FROM `mg_restore_bak42test`.`transaction_type`;')
if ($sourceColorCount -lt 1 -or $sourceTypeCount -lt 1 -or
    $sourceColorCount -ne $stagedColorCount -or $sourceTypeCount -ne $stagedTypeCount) {
    throw 'Staging row counts do not match the source database.'
}

$rejectedExistingTarget = $false
try {
    & (Join-Path $scriptRoot 'Restore-MoneyGestorToStaging.ps1') `
        -BackupPath $backupPath -StagingDatabase mg_restore_bak42test -LoginPath $loginPath -Server mysql -Port 3306 | Out-Null
} catch { $rejectedExistingTarget = $true }
if (-not $rejectedExistingTarget) { throw 'BAK-42 did not refuse an existing staging database.' }
$afterExistingTarget = [Int64](Invoke-MgSql -LoginPath $loginPath -Server mysql -Port 3306 -Sql 'SELECT COUNT(*) FROM `mg_restore_bak42test`.`color`;')
if ($afterExistingTarget -ne $stagedColorCount) { throw 'Existing-target rejection changed staging data.' }

Add-Content -LiteralPath $dumpPath -Value '-- recovery-harness checksum sentinel' -NoNewline
$rejectedCorruptArchive = $false
try {
    & (Join-Path $scriptRoot 'Restore-MoneyGestorToStaging.ps1') `
        -BackupPath $backupPath -StagingDatabase mg_restore_corrupt -LoginPath $loginPath -Server mysql -Port 3306 | Out-Null
} catch { $rejectedCorruptArchive = $true }
if (-not $rejectedCorruptArchive) { throw 'BAK-42 did not reject a checksum-mismatched archive.' }
$corruptDatabaseCount = Invoke-MgSql -LoginPath $loginPath -Server mysql -Port 3306 -Sql "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = 'mg_restore_corrupt';"
if ($corruptDatabaseCount -ne '0') { throw 'A database was created for a corrupt backup.' }

$drillTimer = [Diagnostics.Stopwatch]::StartNew()
$drillOutput = @(& (Join-Path $scriptRoot 'Invoke-MoneyGestorRecoveryDrill.ps1') `
    -DrillSourceDatabase mg_drill_fixture -StagingDatabase mg_restore_bak43test `
    -LoginPath $loginPath -OutputDirectory $outputDirectory -Server mysql -Port 3306)
$drillTimer.Stop()
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'BAK-43 database recovery drill failed.' }
$reportPath = [string]($drillOutput | Where-Object { $_ -match 'recovery-drill-.*\.json$' } | Select-Object -Last 1)
if (-not $reportPath) { throw 'BAK-43 did not emit its drill report.' }
$drillReport = Get-Content -LiteralPath $reportPath -Raw | ConvertFrom-Json
if ($drillReport.result -ne 'database-stage-validated' -or $drillReport.restoredDatabase -ne 'mg_restore_bak43test') {
    throw 'BAK-43 report does not confirm a validated staging restore.'
}
$finalColorCount = [Int64](Invoke-MgSql -LoginPath $loginPath -Server mysql -Port 3306 -Sql 'SELECT COUNT(*) FROM `mg_restore_bak43test`.`color`;')
if ($finalColorCount -ne $sourceColorCount) { throw 'BAK-43 staging data differs from the source.' }

$summary = [ordered]@{
    result = 'BAK-41-42-database-round-trip-passed'
    backupFormat = $manifest.format
    backupHashVerified = $true
    sourceDatabase = 'mg_drill_fixture'
    restoredDatabase = 'mg_restore_bak42test'
    sourceColorRows = $sourceColorCount
    restoredColorRows = $stagedColorCount
    sourceTransactionTypeRows = $sourceTypeCount
    restoredTransactionTypeRows = $stagedTypeCount
    existingTargetRejectedWithoutMutation = $true
    corruptBackupRejectedBeforeDatabaseCreation = $true
    backupDurationSeconds = [Math]::Round($backupTimer.Elapsed.TotalSeconds, 3)
    restoreDurationSeconds = [Math]::Round($restoreTimer.Elapsed.TotalSeconds, 3)
    drillResult = $drillReport.result
    drillStage = $drillReport.restoredDatabase
    drillDurationSeconds = [Math]::Round($drillTimer.Elapsed.TotalSeconds, 3)
    applicationCutover = 'host harness will start the API against source/stage and verify rollback'
}
ConvertTo-Json -InputObject $summary -Depth 4 -Compress
