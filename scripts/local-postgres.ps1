<#
模块说明：本地 PostgreSQL 生命周期

所在层：Windows 本地运维层
主要职责：只启动、停止或查询本项目数据库实例
输入：start stop status 动作与项目数据路径
输出：pg_ctl 的状态和退出码

执行流程：
1. 确认二进制与数据目录。
2. 查询当前实例状态。
3. 调用 pg_ctl 执行指定动作。

约束：固定使用本项目目录和 127.0.0.1 端口参数。
失败处理：缺文件时停止并给出准备步骤。
维护提示：更换端口时同步环境文件和健康检查。
验证重点：重复启动、快速停止、缺数据和状态查询。
#>
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

# Only manage this project's data directory; do not affect other PostgreSQL instances.
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
