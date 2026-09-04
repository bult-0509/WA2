param(
    [ValidateSet('start', 'stop', 'status')]
    [string]$Action = 'status'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$databaseRoot = & (Join-Path $PSScriptRoot 'postgres-path.ps1')
$databaseData = Join-Path $databaseRoot 'data'
$databaseBin = Join-Path $databaseRoot 'pgsql\bin'
$pgControl = Join-Path $databaseBin 'pg_ctl.exe'

# 仅管理本工程指定的数据目录，不影响本机其他 PostgreSQL 实例。
if (-not (Test-Path -LiteralPath $pgControl)) {
    throw 'Project-local PostgreSQL binaries are missing; obtain the approved EDB archive first.'
}
if (-not (Test-Path -LiteralPath (Join-Path $databaseData 'PG_VERSION'))) {
    throw 'Database is not initialized. Run scripts/initialize-postgres.ps1 first.'
}
switch ($Action) {
    'start' {
        & $pgControl -D $databaseData status *> $null
        if ($LASTEXITCODE -eq 0) { Write-Output 'Project PostgreSQL is already running.'; exit 0 }
        & $pgControl -D $databaseData -l (Join-Path $databaseRoot 'postgres.log') -o '-h 127.0.0.1 -p 5432' -w start
    }
    'stop' { & $pgControl -D $databaseData -m fast -w stop }
    'status' { & $pgControl -D $databaseData status }
}
exit $LASTEXITCODE
