[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet('Rebuild', 'Query', 'Explain', 'Path', 'Affected', 'Status', 'Open')]
    [string] $Action = 'Rebuild',
    [switch] $Offline,
    [switch] $Open,
    [Parameter(Position = 1, ValueFromRemainingArguments = $true)]
    [string[]] $Arguments
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$stateRoot = Join-Path $repoRoot '.graphify'
$python = Join-Path $stateRoot 'venv/Scripts/python.exe'
$cli = Join-Path $stateRoot 'venv/Scripts/graphify.exe'
$output = Join-Path $stateRoot 'output'
$entryPage = Join-Path $output 'index.html'
$exitCode = 0
$savedEnvironment = @{}
$runStarted = [DateTime]::UtcNow.ToString('o')

function Invoke-Checked {
    param([string] $Executable, [string[]] $CommandArguments)
    # Windows PowerShell 5 turns redirected native stderr into ErrorRecords.
    # Graphify/uv write ordinary progress and warnings there; use the exit code.
    $ErrorActionPreference = 'Continue'
    & $Executable @CommandArguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: $Executable $($CommandArguments -join ' ')"
    }
}

try {
    if ((Test-Path -LiteralPath $stateRoot) -and ((Get-Item -LiteralPath $stateRoot).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw 'The .graphify directory must be a real local project directory, not a junction or symbolic link.'
    }
    if ($Action -eq 'Open') {
        if (-not (Test-Path -LiteralPath $entryPage)) { throw 'No graph found. Run .\graphify.ps1 first.' }
        Invoke-Item -LiteralPath $entryPage
    } else {
        foreach ($name in @('UV_CACHE_DIR', 'UV_PYTHON_INSTALL_DIR', 'UV_SYSTEM_CERTS', 'PYTHONUTF8', 'PYTHONIOENCODING')) {
            $savedEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, 'Process')
        }
        $env:UV_CACHE_DIR = Join-Path $stateRoot 'cache'
        $env:UV_PYTHON_INSTALL_DIR = Join-Path $stateRoot 'python'
        $env:UV_SYSTEM_CERTS = 'true'
        $env:PYTHONUTF8 = '1'
        $env:PYTHONIOENCODING = 'utf-8'

        if ($Action -eq 'Rebuild') {
            New-Item -ItemType Directory -Path $stateRoot -Force | Out-Null
            @{ status = 'running'; startedAtUtc = $runStarted } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stateRoot 'last-run.json') -Encoding UTF8
            if (-not $Offline) {
                $uv = Join-Path $stateRoot 'bootstrap/uv.exe'
                if (-not (Test-Path -LiteralPath $uv)) {
                    $installedUv = Get-Command uv -ErrorAction SilentlyContinue
                    if ($installedUv) {
                        $uv = $installedUv.Source
                    } else {
                        if ([Runtime.InteropServices.RuntimeInformation]::OSArchitecture -ne 'X64') {
                            throw 'Automatic uv bootstrap requires Windows x64. Install uv and rerun this command.'
                        }
                        Write-Host '[1/4] Downloading uv from the official Astral release...'
                        $bootstrap = Join-Path $stateRoot 'bootstrap'
                        New-Item -ItemType Directory -Path $bootstrap -Force | Out-Null
                        $archive = Join-Path $bootstrap 'uv.zip'
                        [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
                        Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/astral-sh/uv/releases/latest/download/uv-x86_64-pc-windows-msvc.zip' -OutFile $archive
                        Expand-Archive -LiteralPath $archive -DestinationPath $bootstrap -Force
                        Remove-Item -LiteralPath $archive
                    }
                }
                if (-not (Test-Path -LiteralPath $python)) {
                    Invoke-Checked $uv @('venv', '--python', '>=3.10', (Join-Path $stateRoot 'venv'))
                }
                Write-Host '[1/4] Updating Graphify to the latest stable PyPI release...'
                Invoke-Checked $uv @('pip', 'install', '--python', $python, '--upgrade', '--refresh', '--prerelease', 'disallow', '--index-url', 'https://pypi.org/simple', 'graphifyy')
            }
            if (-not (Test-Path -LiteralPath $cli)) { throw 'Graphify is not installed. Run .\graphify.ps1 without -Offline first.' }
            $buildArguments = @((Join-Path $PSScriptRoot 'build.py'), '--root', $repoRoot)
            if ($Offline) { $buildArguments += '--offline' }
            Invoke-Checked $python $buildArguments
            @{ status = 'succeeded'; startedAtUtc = $runStarted; finishedAtUtc = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stateRoot 'last-run.json') -Encoding UTF8
            if ($Open) { Invoke-Item -LiteralPath $entryPage }
        } else {
            if (-not (Test-Path -LiteralPath $cli)) { throw 'Graphify is not installed. Run .\graphify.ps1 first.' }
            if ($Action -eq 'Status') {
                $ErrorActionPreference = 'Continue'
                & $python (Join-Path $PSScriptRoot 'build.py') --root $repoRoot --status
                $exitCode = $LASTEXITCODE
                $ErrorActionPreference = 'Stop'
            } else {
                $graph = Join-Path $output 'graph.json'
                if (-not (Test-Path -LiteralPath $graph)) { throw 'No graph found. Run .\graphify.ps1 first.' }
                $ErrorActionPreference = 'Continue'
                & $cli $Action.ToLowerInvariant() @Arguments --graph $graph
                $exitCode = $LASTEXITCODE
                $ErrorActionPreference = 'Stop'
            }
        }
    }
} catch {
    if ($Action -eq 'Rebuild' -and (Test-Path -LiteralPath $stateRoot) -and -not ((Get-Item -LiteralPath $stateRoot).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        @{ status = 'failed'; startedAtUtc = $runStarted; finishedAtUtc = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $stateRoot 'last-run.json') -Encoding UTF8
    }
    Write-Error -Message $_ -ErrorAction Continue
    $exitCode = 1
} finally {
    foreach ($name in $savedEnvironment.Keys) {
        [Environment]::SetEnvironmentVariable($name, $savedEnvironment[$name], 'Process')
    }
}
exit $exitCode
