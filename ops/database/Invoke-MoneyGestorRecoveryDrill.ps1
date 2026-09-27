[CmdletBinding()]
param(
    [Parameter(Mandatory)][string] $DrillSourceDatabase,
    [Parameter(Mandatory)][string] $LoginPath,
    [Parameter(Mandatory)][string] $OutputDirectory,
    [string] $Server = 'localhost',
    [ValidateRange(1, 65535)][int] $Port = 3306
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'MoneyGestor.DatabaseTools.psm1') -Force
Assert-MySqlTooling
Assert-SchemaName $DrillSourceDatabase
if ($DrillSourceDatabase -notmatch '^mg_(drill|restore)_[A-Za-z0-9_]+$') {
    throw "Recovery drills may use only a disposable 'mg_drill_' or 'mg_restore_' schema."
}

$stamp = [DateTimeOffset]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$stage = 'mg_restore_drill_' + [Guid]::NewGuid().ToString('N')
$backup = & (Join-Path $PSScriptRoot 'New-MoneyGestorBackup.ps1') `
    -Database $DrillSourceDatabase -LoginPath $LoginPath -OutputDirectory $OutputDirectory -Server $Server -Port $Port
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'Backup process failed during recovery drill.' }

& (Join-Path $PSScriptRoot 'Restore-MoneyGestorToStaging.ps1') `
    -BackupPath ([string]$backup) -StagingDatabase $stage -LoginPath $LoginPath -Server $Server -Port $Port
if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw 'Staging restore failed during recovery drill.' }

$report = [ordered]@{
    result = 'database-stage-validated'
    completedUtc = [DateTimeOffset]::UtcNow.ToString('O')
    sourceDatabase = $DrillSourceDatabase
    backupPath = [string]$backup
    restoredDatabase = $stage
    applicationCutover = 'not performed by this script; verify using the isolated application smoke-test procedure in DATABASE_RECOVERY.md'
    cleanup = 'manual after evidence review; this script never drops a database'
}
$reportPath = Join-Path ([IO.Path]::GetFullPath($OutputDirectory)) "recovery-drill-$stamp.json"
[IO.File]::WriteAllText($reportPath, (ConvertTo-Json -InputObject $report -Depth 4) + "`n", [Text.UTF8Encoding]::new($false))
Write-Output $reportPath
