[CmdletBinding()]
param(
    [Parameter(Mandatory)][string] $Database,
    [Parameter(Mandatory)][string] $LoginPath,
    [Parameter(Mandatory)][string] $OutputDirectory,
    [string] $Server = 'localhost',
    [ValidateRange(1, 65535)][int] $Port = 3306
)

$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSScriptRoot 'MoneyGestor.DatabaseTools.psm1') -Force
Assert-MySqlTooling
Assert-SchemaName $Database
if ($LoginPath -notmatch '^[A-Za-z0-9_-]{1,64}$') { throw 'LoginPath must be a MySQL login-path name.' }
if ($LoginPath -ne 'client') { throw 'mysqldump requires the protected shared MySQL login path named client.' }

$output = [IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($output) | Out-Null
$db = Get-MgDatabaseSnapshot -LoginPath $LoginPath -Database $Database -Server $Server -Port $Port
$serverVersion = Invoke-MgSql -LoginPath $LoginPath -Server $Server -Port $Port -Sql 'SELECT VERSION();'
$created = [DateTimeOffset]::UtcNow
$stamp = $created.ToString('yyyyMMddTHHmmssZ')
$finalPath = Join-Path $output "moneygestor-$stamp.mgbak"
if (Test-Path -LiteralPath $finalPath) { throw "Backup destination already exists: $finalPath" }
$partialPath = Join-Path $output ".moneygestor-$stamp-$([Guid]::NewGuid().ToString('N')).partial"
if (Test-Path -LiteralPath $partialPath) { throw 'Refusing to reuse an existing temporary backup directory.' }
[IO.Directory]::CreateDirectory($partialPath) | Out-Null

try {
    $dumpPath = Join-Path $partialPath 'database.sql'
    $arguments = @(
        '--login-path=client',
        ('--host=' + $Server),
        ('--port=' + $Port),
        '--single-transaction',
        '--quick',
        '--skip-lock-tables',
        '--routines',
        '--events',
        '--triggers',
        '--hex-blob',
        '--no-tablespaces',
        '--set-gtid-purged=OFF',
        '--result-file',
        $dumpPath,
        $Database
    )
    $dump = Invoke-MySqlProcess -Executable 'mysqldump' -Arguments $arguments
    if ($dump.ExitCode -ne 0) {
        $diagnostic = $dump.StandardError.Trim()
        if (-not $diagnostic -and $dump.StandardOutput -match '^Usage: mysqldump') { $diagnostic = 'mysqldump printed usage; verify its arguments.' }
        throw "mysqldump failed (exit $($dump.ExitCode)): $diagnostic"
    }
    if (-not (Test-Path -LiteralPath $dumpPath) -or (Get-Item -LiteralPath $dumpPath).Length -eq 0) {
        throw 'mysqldump completed without producing a non-empty SQL dump.'
    }

    $manifest = [ordered]@{
        format = 'moneygestor-mysql-logical-backup'
        formatVersion = 1
        createdUtc = $created.ToString('O')
        sourceDatabase = $Database
        mysqlServerVersion = $serverVersion
        characterSet = $db.CharacterSet
        collation = $db.Collation
        consistency = 'InnoDB single transaction; DDL must be frozen for the duration of the dump'
        tables = @($db.Tables)
        dumpFile = 'database.sql'
        dumpLengthBytes = (Get-Item -LiteralPath $dumpPath).Length
        dumpSha256 = (Get-FileHash -LiteralPath $dumpPath -Algorithm SHA256).Hash.ToLowerInvariant()
        containsSensitiveData = $true
    }
    $manifestPath = Join-Path $partialPath 'manifest.json'
    $json = ConvertTo-Json -InputObject $manifest -Depth 8
    [IO.File]::WriteAllText($manifestPath, $json + "`n", [Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $partialPath -Destination $finalPath
    Write-Output $finalPath
} catch {
    $partialFullPath = [IO.Path]::GetFullPath($partialPath)
    $partialParent = [IO.Path]::GetFullPath([IO.Path]::GetDirectoryName($partialFullPath))
    if ($partialParent -eq $output -and [IO.Path]::GetFileName($partialFullPath) -match '^\.moneygestor-[0-9]{8}T[0-9]{6}Z-[0-9a-f]{32}\.partial$' -and (Test-Path -LiteralPath $partialFullPath -PathType Container)) {
        Remove-Item -LiteralPath $partialFullPath -Recurse -Force
    }
    throw
}
