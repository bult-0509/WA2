<#
模块说明：PostgreSQL ASCII 路径适配

所在层：Windows 本地运维层
主要职责：为包含中文的项目目录建立稳定的 ASCII 联接路径
输入：项目 .local 存储绝对路径
输出：原路径或经校验的目录联接

执行流程：
1. 判断路径是否含非 ASCII 字符。
2. 根据原路径计算稳定摘要。
3. 创建或验证专用 Junction。

约束：已有联接若指向其他位置必须拒绝修改。
失败处理：创建失败时抛错，不回退到不安全路径。
维护提示：移动项目后会得到新的摘要路径。
验证重点：纯英文路径、中文路径、旧联接和目标冲突。
#>
$projectRoot = Split-Path -Parent $PSScriptRoot
$storagePath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot '.local\postgresql'))
if ($storagePath -notmatch '[^\x00-\x7F]') { return $storagePath }

# Windows initdb records its installation path in SQL, so use an ASCII-only junction.
# The binaries, configuration, and data remain stored under the project's .local directory.
$aliasParent = Join-Path $env:LOCALAPPDATA 'WemoveRuntimeLinks'
New-Item -ItemType Directory -Force -Path $aliasParent | Out-Null
$sha256 = [System.Security.Cryptography.SHA256]::Create()
try {
    $hashBytes = $sha256.ComputeHash([Text.Encoding]::UTF8.GetBytes($storagePath))
} finally {
    $sha256.Dispose()
}
$digest = ([BitConverter]::ToString($hashBytes) -replace '-', '').Substring(0,12)
$aliasPath = Join-Path $aliasParent "postgres-$digest"
if (Test-Path -LiteralPath $aliasPath) {
    $existingAlias = Get-Item -LiteralPath $aliasPath
    if ($existingAlias.LinkType -ne 'Junction' -or [System.IO.Path]::GetFullPath($existingAlias.Target) -ne $storagePath) {
        throw 'Runtime alias exists and points elsewhere; it will not be changed.'
    }
} else { New-Item -ItemType Junction -Path $aliasPath -Target $storagePath | Out-Null }
return $aliasPath
