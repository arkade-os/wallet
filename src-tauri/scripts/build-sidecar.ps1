param([string]$Python = "py", [switch]$UseExistingEnvironment)
$ErrorActionPreference = "Stop"
$nativeRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
$environmentPath = Join-Path $nativeRoot ".sidecar-venv"
if ($UseExistingEnvironment) {
    $buildPython = $Python
} else {
    if (-not (Test-Path -LiteralPath (Join-Path $environmentPath "Scripts/python.exe"))) {
        & $Python -3 -m venv $environmentPath
        if ($LASTEXITCODE -ne 0) { throw "Unable to create the local sidecar build environment" }
    }
    $buildPython = Join-Path $environmentPath "Scripts/python.exe"
}
& $buildPython -m pip install -r (Join-Path $nativeRoot "resources/requirements.txt")
if ($LASTEXITCODE -ne 0) { throw "Unable to install pinned sidecar dependencies" }
& $buildPython (Join-Path $nativeRoot "scripts/collect-licenses.py")
if ($LASTEXITCODE -ne 0) { throw "Unable to collect sidecar dependency notices" }
$binaryDirectory = Join-Path $nativeRoot "binaries"
$buildDirectory = Join-Path $nativeRoot ".sidecar-build"
New-Item -ItemType Directory -Force -Path $binaryDirectory, $buildDirectory | Out-Null
& $buildPython -m PyInstaller --noconfirm --clean --onefile --console --name satochip-bridge `
    --collect-all pysatochip --collect-all smartcard `
    --distpath $binaryDirectory --workpath (Join-Path $buildDirectory "work") `
    --specpath $buildDirectory (Join-Path $nativeRoot "resources/bridge.py")
if ($LASTEXITCODE -ne 0) { throw "Unable to build the packaged Satochip bridge" }
$hostTriple = ((& rustc -vV | Select-String '^host:').ToString() -replace '^host:\s*', '').Trim()
Copy-Item -LiteralPath (Join-Path $binaryDirectory "satochip-bridge.exe") `
    -Destination (Join-Path $binaryDirectory "satochip-bridge-$hostTriple.exe") -Force
Write-Output "Built Satochip sidecar for $hostTriple"
