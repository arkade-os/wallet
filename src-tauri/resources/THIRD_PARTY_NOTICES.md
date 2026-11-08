# Native card helper dependencies

The Windows helper bundles Python and the packages listed, with their versions and available upstream links, in `licenses/packages.json`. Their accompanying license and notice files are included under `licenses/`.

The Satochip connector is unmodified `pysatochip` 0.18.5, licensed under LGPLv3, from https://github.com/Toporin/pysatochip. The local `bridge.py` client source is supplied beside this notice. `scripts/build-sidecar.ps1`, `scripts/collect-licenses.py` and `resources/requirements.txt` in the wallet repository provide the inputs to rebuild the helper with a replacement connector.

PyInstaller's bootloader is distributed under its GPL license with the distribution exception stated in its included license. Python's PSF license and other dependency notices are included in the same directory. The Android transport uses the separately documented official Satochip Java connector and includes its Apache-2.0 license in that plugin's resources.
