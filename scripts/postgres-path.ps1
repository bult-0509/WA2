$projectRoot = Split-Path -Parent $PSScriptRoot
$storagePath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot '.local\postgresql'))
if ($storagePath -notmatch '[^\x00-\x7F]') { return $storagePath }

# Windows initdb 会将安装路径写入 SQL；中文路径需通过英文目录联接访问。
# 联接只提供入口，二进制、配置和数据的实际存储仍在项目 .local 下。
$aliasParent = Join-Path $env:LOCALAPPDATA 'WemoveRuntimeLinks'
New-Item -ItemType Directory -Force -Path $aliasParent | Out-Null
$digest = [Convert]::ToHexString([System.Security.Cryptography.SHA256]::HashData([Text.Encoding]::UTF8.GetBytes($storagePath))).Substring(0,12)
$aliasPath = Join-Path $aliasParent "postgres-$digest"
if (Test-Path -LiteralPath $aliasPath) {
    $existingAlias = Get-Item -LiteralPath $aliasPath
    if ($existingAlias.LinkType -ne 'Junction' -or [System.IO.Path]::GetFullPath($existingAlias.Target) -ne $storagePath) {
        throw 'Runtime alias exists and points elsewhere; it will not be changed.'
    }
} else { New-Item -ItemType Junction -Path $aliasPath -Target $storagePath | Out-Null }
return $aliasPath
