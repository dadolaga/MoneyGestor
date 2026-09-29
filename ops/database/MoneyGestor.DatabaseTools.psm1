Set-StrictMode -Version Latest
if ($PSVersionTable.PSVersion.Major -lt 7) { throw 'PowerShell 7 or later is required.' }

function Assert-MySqlTooling {
    foreach ($name in @('mysql', 'mysqldump')) {
        if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
            throw "Required MySQL 8.4 client utility '$name' was not found in PATH."
        }
    }
}

function Assert-SchemaName([string] $Name) {
    if ($Name -notmatch '^[A-Za-z][A-Za-z0-9_]{0,62}$') {
        throw 'Database names must start with a letter and contain only ASCII letters, digits, or underscores (maximum 63 characters).'
    }
}

function Invoke-MySqlProcess {
    param(
        [Parameter(Mandatory)][string] $Executable,
        [Parameter(Mandatory)][string[]] $Arguments,
        [string] $InputPath
    )

    $start = [Diagnostics.ProcessStartInfo]::new()
    $start.FileName = $Executable
    $start.UseShellExecute = $false
    $start.RedirectStandardOutput = $true
    $start.RedirectStandardError = $true
    $start.RedirectStandardInput = [bool]$InputPath
    foreach ($name in @('HOME', 'MYSQL_HOME', 'MYSQL_TEST_LOGIN_FILE')) {
        $value = [Environment]::GetEnvironmentVariable($name)
        if ($value) { $start.Environment[$name] = $value }
    }
    foreach ($argument in $Arguments) { [void] $start.ArgumentList.Add($argument) }

    $process = [Diagnostics.Process]::new()
    $process.StartInfo = $start
    if (-not $process.Start()) { throw "Could not start '$Executable'." }

    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    $inputError = $null
    try {
        if ($InputPath) {
            $inputStream = [IO.File]::OpenRead($InputPath)
            try { $inputStream.CopyTo($process.StandardInput.BaseStream) }
            finally { $inputStream.Dispose() }
        }
    } catch {
        $inputError = $_.Exception
    } finally {
        if ($InputPath) { $process.StandardInput.Close() }
    }
    $process.WaitForExit()
    $result = [pscustomobject]@{
        ExitCode = $process.ExitCode
        StandardOutput = $stdout.GetAwaiter().GetResult()
        StandardError = $stderr.GetAwaiter().GetResult()
    }
    $process.Dispose()
    if ($inputError) { throw $inputError }
    return $result
}

function Invoke-MgSql {
    param(
        [Parameter(Mandatory)][string] $LoginPath,
        [Parameter(Mandatory)][string] $Sql,
        [string] $Database,
        [string] $InputPath,
        [string] $Server,
        [int] $Port
    )
    $arguments = @('--login-path=' + $LoginPath, '--batch', '--raw', '--skip-column-names')
    if ($Server) { $arguments += '--host=' + $Server }
    if ($Port) { $arguments += '--port=' + $Port }
    if ($Database) { $arguments += @('--database=' + $Database) }
    $arguments += @('--execute=' + $Sql)
    $result = Invoke-MySqlProcess -Executable 'mysql' -Arguments $arguments -InputPath $InputPath
    if ($result.ExitCode -ne 0) { throw "mysql failed (exit $($result.ExitCode)): $($result.StandardError.Trim())" }
    return $result.StandardOutput.TrimEnd("`r", "`n")
}

function Get-MgDatabaseSnapshot {
    param([Parameter(Mandatory)][string] $LoginPath, [Parameter(Mandatory)][string] $Database, [string] $Server, [int] $Port)
    Assert-SchemaName $Database
    $queryOptions = @{ LoginPath = $LoginPath; Server = $Server; Port = $Port }
    $tablesOutput = Invoke-MgSql @queryOptions -Sql "SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$Database' AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME;"
    $tables = @()
    foreach ($line in ($tablesOutput -split "`r?`n" | Where-Object { $_ })) {
        $parts = $line -split "`t", 2
        if ($parts.Count -ne 2) { throw 'Could not parse the source schema table inventory.' }
        if ($parts[1] -ne 'InnoDB') { throw "Backup requires every base table to use InnoDB; '$($parts[0])' uses '$($parts[1])'." }
        $tables += $parts[0]
    }
    if ($tables.Count -eq 0) { throw "Database '$Database' has no base tables." }
    $viewCount = Invoke-MgSql @queryOptions -Sql "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '$Database' AND TABLE_TYPE = 'VIEW';"
    if ($viewCount -ne '0') { throw 'Database views require an explicit inventory extension before backup.' }
    $required = @('AspNetRoleClaims', 'AspNetRoles', 'AspNetUserClaims', 'AspNetUserLogins', 'AspNetUserRoles', 'AspNetUserTokens', 'AspNetUsers', '__EFMigrationsHistory', 'color', 'login', 'transaction', 'transaction_type', 'user', 'wallet')
    $missing = @($required | Where-Object { $_ -notin $tables })
    if ($missing.Count -gt 0) { throw ('Database is missing required MoneyGestor tables: ' + ($missing -join ', ')) }
    $schemaInfo = Invoke-MgSql @queryOptions -Sql "SELECT DEFAULT_CHARACTER_SET_NAME, DEFAULT_COLLATION_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = '$Database';"
    $schemaParts = $schemaInfo -split "`t", 2
    if ($schemaParts.Count -ne 2) { throw 'Could not determine database character set and collation.' }
    return [pscustomobject]@{ Tables = $tables; CharacterSet = $schemaParts[0]; Collation = $schemaParts[1] }
}

function Get-ManifestFilePath([string] $BackupPath) { return Join-Path $BackupPath 'manifest.json' }
function Get-DumpFilePath([string] $BackupPath) { return Join-Path $BackupPath 'database.sql' }

Export-ModuleMember -Function Assert-MySqlTooling, Assert-SchemaName, Invoke-MySqlProcess, Invoke-MgSql, Get-MgDatabaseSnapshot, Get-ManifestFilePath, Get-DumpFilePath
