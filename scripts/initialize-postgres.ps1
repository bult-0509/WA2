param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$databaseRoot = & (Join-Path $PSScriptRoot 'postgres-path.ps1')
$databaseData = Join-Path $databaseRoot 'data'
$databaseBin = Join-Path $databaseRoot 'pgsql\bin'
$environmentFile = Join-Path $projectRoot '.env'
$passwordFile = Join-Path $databaseRoot 'init-password.txt'
$initDatabase = Join-Path $databaseBin 'initdb.exe'

# 保护已有数据库与环境配置；初始化失败后也不自动清空或重建数据目录。
if (-not (Test-Path -LiteralPath $initDatabase)) { throw 'Approved PostgreSQL binaries are missing.' }
if (Test-Path -LiteralPath $databaseData) { throw 'Data directory already exists. Inspect it before retrying initialization.' }
if (Test-Path -LiteralPath $environmentFile) { throw 'Existing .env will not be overwritten.' }

$secretBytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Fill($secretBytes)
$ownerSecret = [Convert]::ToHexString($secretBytes).ToLowerInvariant()
[System.Security.Cryptography.RandomNumberGenerator]::Fill($secretBytes)
$applicationSecret = [Convert]::ToHexString($secretBytes).ToLowerInvariant()
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
    $environmentText = "DATABASE_URL=postgresql://wemove:${applicationSecret}@127.0.0.1:5432/wemove`nAPI_PORT=3101`n"
    [System.IO.File]::WriteAllText($environmentFile, $environmentText, $utf8NoBom)
    Write-Output 'Initialized project PostgreSQL. Restart the API, then run npm run check:runtime.'
} finally {
    $env:PGPASSWORD = $previousPassword
    # 单个本次生成的临时密码文件，用后清除；凭据不输出到终端。
    if (Test-Path -LiteralPath $passwordFile) { Remove-Item -LiteralPath $passwordFile }
}
