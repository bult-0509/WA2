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
