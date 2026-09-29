[CmdletBinding()]
param(
    [Parameter(Mandatory)][string] $BackupPath,
    [Parameter(Mandatory)][string] $StagingDatabase,
    [Parameter(Mandatory)][string] $LoginPath,
    [string] $Server = 'localhost',
    [ValidateRange(1, 65535)][int] $Port = 3306
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'MoneyGestor.DatabaseTools.psm1') -Force
Assert-MySqlTooling
Assert-SchemaName $StagingDatabase
if ($StagingDatabase -notmatch '^mg_restore_[A-Za-z0-9_]+$') { throw "Staging database must use the reserved 'mg_restore_' prefix." }
if ($LoginPath -notmatch '^[A-Za-z0-9_-]{1,64}$') { throw 'LoginPath must be a MySQL login-path name.' }

$backup = [IO.Path]::GetFullPath($BackupPath)
$manifestPath = Get-ManifestFilePath $backup
$dumpPath = Get-DumpFilePath $backup
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf) -or -not (Test-Path -LiteralPath $dumpPath -PathType Leaf)) {
    throw 'Backup must contain manifest.json and database.sql at its root.'
}
$manifestFile = Get-Item -LiteralPath $manifestPath
if ($manifestFile.Length -gt 1048576) { throw 'Backup manifest exceeds the 1 MiB safety limit.' }
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($manifest.format -ne 'moneygestor-mysql-logical-backup' -or $manifest.formatVersion -ne 1) { throw 'Unsupported MoneyGestor backup format.' }
if ($manifest.dumpFile -ne 'database.sql' -or $manifest.containsSensitiveData -ne $true) { throw 'Backup manifest is invalid.' }
if ([string]$manifest.dumpSha256 -notmatch '^[a-f0-9]{64}$' -or [Int64]$manifest.dumpLengthBytes -lt 1) { throw 'Backup manifest checksum or length is invalid.' }
Assert-SchemaName ([string]$manifest.sourceDatabase)
if ($manifest.sourceDatabase -eq $StagingDatabase) { throw 'Source and staging database names must differ.' }
if (-not $manifest.tables -or $manifest.tables.Count -eq 0) { throw 'Backup manifest has no table inventory.' }
foreach ($table in $manifest.tables) {
    if ([string]$table -notmatch '^[A-Za-z0-9_]+$') { throw 'Backup manifest contains an invalid table name.' }
}

$dump = Get-Item -LiteralPath $dumpPath
if ($dump.Length -ne [Int64]$manifest.dumpLengthBytes) { throw 'Backup SQL byte length does not match the manifest.' }
$actualHash = (Get-FileHash -LiteralPath $dumpPath -Algorithm SHA256).Hash.ToLowerInvariant()
if ($actualHash -ne [string]$manifest.dumpSha256) { throw 'Backup SQL SHA-256 does not match the manifest.' }

$schemaCharset = [string]$manifest.characterSet
$schemaCollation = [string]$manifest.collation
if ($schemaCharset -notmatch '^[A-Za-z0-9_]+$' -or $schemaCollation -notmatch '^[A-Za-z0-9_]+$') {
    throw 'Backup manifest contains invalid schema charset/collation values.'
}
$serverArgs = @('--login-path=' + $LoginPath, '--host=' + $Server, '--port=' + $Port)
$alreadyExists = Invoke-MgSql -LoginPath $LoginPath -Server $Server -Port $Port -Sql "SELECT COUNT(*) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '$StagingDatabase';"
if ($alreadyExists -ne '0') { throw "Refusing to modify existing staging database '$StagingDatabase'." }

Invoke-MgSql -LoginPath $LoginPath -Server $Server -Port $Port -Sql "CREATE DATABASE ``$StagingDatabase`` CHARACTER SET $schemaCharset COLLATE $schemaCollation;" | Out-Null
try {
    $restoreArgs = $serverArgs + @('--binary-mode=1', '--database=' + $StagingDatabase)
    $restore = Invoke-MySqlProcess -Executable 'mysql' -Arguments $restoreArgs -InputPath $dumpPath
    if ($restore.ExitCode -ne 0) { throw "mysql restore failed (exit $($restore.ExitCode)): $($restore.StandardError.Trim())" }

    $snapshot = Get-MgDatabaseSnapshot -LoginPath $LoginPath -Database $StagingDatabase -Server $Server -Port $Port
    $expectedTables = @($manifest.tables | Sort-Object -CaseSensitive)
    $actualTables = @($snapshot.Tables | Sort-Object -CaseSensitive)
    if (Compare-Object -ReferenceObject $expectedTables -DifferenceObject $actualTables -CaseSensitive) {
        throw 'Restored table inventory differs from the backup manifest.'
    }
    $historyCount = Invoke-MgSql -LoginPath $LoginPath -Server $Server -Port $Port -Sql "SELECT COUNT(*) FROM ``$StagingDatabase``.__EFMigrationsHistory;"
    if ([Int64]$historyCount -lt 1) { throw 'Restored database has no EF migration history.' }

    foreach ($table in $snapshot.Tables) {
        $checkRows = Invoke-MgSql -LoginPath $LoginPath -Server $Server -Port $Port `
            -Sql "CHECK TABLE ``$StagingDatabase``.``$table``;"
        $statusRows = @($checkRows -split "`r?`n" | Where-Object { $_ -match "\tstatus\tOK$" })
        if ($statusRows.Count -ne 1) { throw "CHECK TABLE did not report status OK for '$table'." }
    }
    Write-Output "validated_staging_database=$StagingDatabase"
    Write-Output 'The source database was not modified. Keep this schema isolated until the application smoke check passes.'
} catch {
    Write-Error "Staging restore did not validate. Database '$StagingDatabase' was retained for inspection and was not promoted. $($_.Exception.Message)"
    throw
}
