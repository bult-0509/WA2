<#
模块说明：开发环境文件准备

所在层：Windows 本地运维层
主要职责：在缺少 .env 时生成随机凭据并恢复已有数据库连接
输入：模板文件、本地密钥备份和项目数据库状态
输出：可用的 .env 以及同步后的应用角色口令

执行流程：
1. 保留已有有效应用密钥。
2. 生成数据库和应用随机密钥。
3. 必要时启动数据库并同步角色密码。

约束：真实密钥只写入被忽略的本机文件。
失败处理：同步失败时保留错误并停止启动流程。
维护提示：修改环境字段时同步模板、初始化脚本和 README。
验证重点：首次克隆、误删 .env、已有数据库和无二进制环境。
#>
param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$environmentFile = Join-Path $projectRoot '.env'
$templateFile = Join-Path $projectRoot '.env.example'
$secretBackup = Join-Path $projectRoot '.local\runtime-app-key.txt'
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

if (Test-Path -LiteralPath $environmentFile) {
    $appKeyLine = Get-Content -LiteralPath $environmentFile | Where-Object { $_ -match '^APP_KEY=(.+)$' } | Select-Object -First 1
    if ($appKeyLine -and $appKeyLine -match '^APP_KEY=(.+)$') {
        New-Item -ItemType Directory -Force -Path (Split-Path -Parent $secretBackup) | Out-Null
        [System.IO.File]::WriteAllText($secretBackup,$matches[1].Trim(),$utf8NoBom)
    }
    Write-Output 'Environment file is ready.'
    exit 0
}
if (-not (Test-Path -LiteralPath $templateFile)) {
    throw '.env.example is missing; the project cannot create a local environment file.'
}

function New-HexSecret {
    $bytes = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $generator.GetBytes($bytes) } finally { $generator.Dispose() }
    return ([BitConverter]::ToString($bytes) -replace '-', '').ToLowerInvariant()
}

$databaseSecret = New-HexSecret
$applicationSecret = if (Test-Path -LiteralPath $secretBackup) { (Get-Content -LiteralPath $secretBackup -Raw).Trim() } else { New-HexSecret }
$content = @(
    "DATABASE_URL=postgresql://wemove:${databaseSecret}@127.0.0.1:5432/wemove"
    'POSTGRES_USER=wemove'
    "POSTGRES_PASSWORD=$databaseSecret"
    'POSTGRES_DB=wemove'
    'API_PORT=3101'
    "APP_KEY=$applicationSecret"
    'WEB_ORIGIN=http://127.0.0.1:3100'
) -join "`n"
[System.IO.File]::WriteAllText($environmentFile,"$content`n",$utf8NoBom)
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $secretBackup) | Out-Null
[System.IO.File]::WriteAllText($secretBackup,$applicationSecret,$utf8NoBom)

# If a project-local database already exists, synchronize its application-role password
# so deleting .env does not make the existing database unusable.
$localDatabaseStorage = Join-Path $projectRoot '.local\postgresql'
if (Test-Path -LiteralPath $localDatabaseStorage) {
    $databaseRoot = & (Join-Path $PSScriptRoot 'postgres-path.ps1')
    $databaseData = Join-Path $databaseRoot 'data'
    $databaseBin = Join-Path $databaseRoot 'pgsql\bin'
    $ownerPasswordFile = Join-Path $databaseRoot 'owner-password.txt'
    $psql = Join-Path $databaseBin 'psql.exe'
}
if ($databaseRoot -and (Test-Path -LiteralPath (Join-Path $databaseData 'PG_VERSION')) -and
    (Test-Path -LiteralPath $ownerPasswordFile) -and
    (Test-Path -LiteralPath $psql)) {
    & (Join-Path $PSScriptRoot 'local-postgres.ps1') -Action start | Out-Host
    if ($LASTEXITCODE -ne 0) { throw 'The environment file was created, but PostgreSQL could not start for credential synchronization.' }
    $previousPassword = $env:PGPASSWORD
    try {
        $env:PGPASSWORD = (Get-Content -LiteralPath $ownerPasswordFile -Raw).Trim()
        "ALTER ROLE wemove WITH PASSWORD '$databaseSecret';" | & $psql -h 127.0.0.1 -p 5432 -U wemove_owner -d postgres -v ON_ERROR_STOP=1 | Out-Host
        if ($LASTEXITCODE -ne 0) { throw 'The environment file was created, but the database role password could not be synchronized.' }
    } finally {
        $env:PGPASSWORD = $previousPassword
    }
    Write-Output 'Created .env and synchronized the existing project database credentials.'
} else {
    Write-Output 'Created .env with new local development secrets. Initialize PostgreSQL before first use.'
}
