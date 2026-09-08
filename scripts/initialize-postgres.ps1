<#
模块说明：项目 PostgreSQL 初始化

所在层：Windows 本地运维层
主要职责：使用项目二进制建立独立数据目录、角色和数据库
输入：已下载的 PostgreSQL、.env 与空数据目录
输出：可启动的本地实例和最小权限应用角色

执行流程：
1. 生成临时超级用户口令。
2. 运行 initdb 并启动实例。
3. 创建 wemove 角色与数据库。

约束：拒绝覆盖已有数据目录，应用不使用超级用户。
失败处理：任一步失败都保留数据目录供人工检查。
维护提示：升级 PostgreSQL 时先验证路径别名和数据兼容。
验证重点：缺二进制、已有目录、无效口令和初始化失败。
#>
param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$databaseRoot = & (Join-Path $PSScriptRoot 'postgres-path.ps1')
$databaseData = Join-Path $databaseRoot 'data'
$databaseBin = Join-Path $databaseRoot 'pgsql\bin'
$environmentFile = Join-Path $projectRoot '.env'
$passwordFile = Join-Path $databaseRoot 'init-password.txt'
$initDatabase = Join-Path $databaseBin 'initdb.exe'

# 保护已有数据库；初始化失败后也不自动清空或重建数据目录。
if (-not (Test-Path -LiteralPath $initDatabase)) { throw 'Approved PostgreSQL binaries are missing.' }
if (Test-Path -LiteralPath $databaseData) { throw 'Data directory already exists. Inspect it before retrying initialization.' }

function New-HexSecret {
    $bytes = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return ([BitConverter]::ToString($bytes) -replace '-', '').ToLowerInvariant()
}
$ownerSecret = New-HexSecret
if (-not (Test-Path -LiteralPath $environmentFile)) {
    & (Join-Path $PSScriptRoot 'ensure-env.ps1') | Out-Host
}
$environment = @{}
foreach ($line in Get-Content -LiteralPath $environmentFile) {
    if ($line -match '^([^#=]+)=(.*)$') { $environment[$matches[1].Trim()] = $matches[2].Trim() }
}
$applicationSecret = $environment['POSTGRES_PASSWORD']
if ($applicationSecret -notmatch '^[a-fA-F0-9]{64}$') {
    throw '.env must contain the generated 64-character POSTGRES_PASSWORD before database initialization.'
}
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($passwordFile, $ownerSecret, $utf8NoBom)
$previousPassword = $env:PGPASSWORD

try {
    & $initDatabase -D $databaseData -U wemove_owner --encoding=UTF8 --locale=C --auth=scram-sha-256 --pwfile=$passwordFile
    if ($LASTEXITCODE -ne 0) { throw 'initdb failed; preserve the directory for inspection.' }
    # 超级用户口令仅存项目私有目录，应用使用独立的非超级用户角色。
    [System.IO.File]::WriteAllText((Join-Path $databaseRoot 'owner-password.txt'), $ownerSecret, $utf8NoBom)
    & (Join-Path $PSScriptRoot 'local-postgres.ps1') -Action start
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL did not start.' }
    $env:PGPASSWORD = $ownerSecret
    $bootstrapSql = "CREATE ROLE wemove LOGIN PASSWORD '$applicationSecret';`nCREATE DATABASE wemove OWNER wemove;"
    $bootstrapSql | & (Join-Path $databaseBin 'psql.exe') -h 127.0.0.1 -p 5432 -U wemove_owner -d postgres -v ON_ERROR_STOP=1
    if ($LASTEXITCODE -ne 0) { throw 'Database role setup failed; inspect the existing instance.' }
    Write-Output 'Initialized project PostgreSQL with the credentials in .env. Run npm.cmd run db:setup next.'
} finally {
    $env:PGPASSWORD = $previousPassword
    # 单个本次生成的临时密码文件，用后清除；凭据不输出到终端。
    if (Test-Path -LiteralPath $passwordFile) { Remove-Item -LiteralPath $passwordFile }
}
