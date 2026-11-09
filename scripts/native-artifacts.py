import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import tarfile
import zipfile


KINDS = ("windows", "linux", "macos", "android", "ios-simulator", "ios-device")
ANDROID_ABIS = ("arm64-v8a", "armeabi-v7a", "x86", "x86_64")


def one(root, pattern, directory=False):
    matches = sorted(root.glob(pattern))
    if len(matches) != 1:
        raise ValueError(f"Expected one {pattern}; found {len(matches)}")
    path = matches[0]
    valid = path.is_dir() if directory else path.is_file() and path.stat().st_size > 0
    if path.is_symlink() or not valid:
        raise ValueError(f"Missing or empty artifact: {path}")
    return path


def app_binary(app, macos=False):
    contents = app / "Contents" if macos else app
    with (contents / "Info.plist").open("rb") as source:
        executable = plistlib.load(source).get("CFBundleExecutable")
    if not isinstance(executable, str) or Path(executable).name != executable:
        raise ValueError(f"Invalid bundle executable: {app}")
    binary = contents / "MacOS" / executable if macos else contents / executable
    if not binary.is_file() or binary.stat().st_size == 0:
        raise ValueError(f"Missing bundle executable: {app}")


def verify_apk(path):
    with zipfile.ZipFile(path) as archive:
        for abi in ANDROID_ABIS:
            member = f"lib/{abi}/libarkade_native_lib.so"
            if member not in archive.namelist() or archive.getinfo(member).file_size == 0:
                raise ValueError(f"Universal APK is missing {abi}")


def verify_ipa(path):
    with zipfile.ZipFile(path) as archive:
        infos = [name for name in archive.namelist()
                 if name.startswith("Payload/") and name.count("/") == 2 and name.endswith(".app/Info.plist")]
        if len(infos) != 1:
            raise ValueError("Expected one application in the unsigned IPA")
        executable = plistlib.loads(archive.read(infos[0])).get("CFBundleExecutable")
        if not isinstance(executable, str) or Path(executable).name != executable:
            raise ValueError("Invalid IPA bundle executable")
        binary = infos[0].rsplit("/", 1)[0] + "/" + executable
        if binary not in archive.namelist() or archive.getinfo(binary).file_size == 0:
            raise ValueError("IPA is missing its application executable")


def collect(kind, root, output):
    root, output = Path(root), Path(output)
    bundle = root / "src-tauri/target/release/bundle"
    apple = root / "src-tauri/gen/apple/build"
    packages = []
    if kind == "windows":
        for pattern in ("nsis/*.exe", "msi/*.msi"):
            path = one(bundle, pattern)
            packages.append((path, path.name, False))
    elif kind == "linux":
        deb, image = one(bundle, "deb/*.deb"), one(bundle, "appimage/*.AppImage")
        packages = [(deb, deb.name, False), (image, image.name + ".tar.gz", True)]
    elif kind == "macos":
        app, dmg = one(bundle, "macos/*.app", True), one(bundle, "dmg/*.dmg")
        app_binary(app, macos=True)
        packages = [(app, app.name + ".tar.gz", True), (dmg, dmg.name, False)]
    elif kind == "android":
        apk = one(root, "src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk")
        verify_apk(apk)
        packages = [(apk, "Arkade-android-universal-debug.apk", False)]
    elif kind == "ios-simulator":
        apps = [path for arch in ("arm64-sim", "x86_64") for path in (apple / arch).glob("*.app")]
        if len(apps) != 1 or apps[0].is_symlink():
            raise ValueError("Expected one simulator application")
        app_binary(apps[0])
        packages = [(apps[0], "Arkade-ios-simulator.app.tar.gz", True)]
    elif kind == "ios-device":
        ipa = one(apple, "arm64/*.ipa")
        verify_ipa(ipa)
        packages = [(ipa, "Arkade-ios-device-unsigned.ipa", False)]
    else:
        raise ValueError(f"Unsupported artifact kind: {kind}")
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        raise ValueError(f"Artifact destination must be empty: {output}")
    commit = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip()
    output.mkdir(parents=True, exist_ok=True)
    for path, name, archive in packages:
        if archive:
            with tarfile.open(output / name, "w:gz", dereference=False) as target:
                target.add(path, arcname=path.name)
        else:
            shutil.copy2(path, output / name)
    metadata = {"kind": kind, "commit": commit, "run_id": os.environ.get("GITHUB_RUN_ID"),
                "ref": os.environ.get("GITHUB_REF")}
    (output / "SOURCE.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    checksums = []
    for path in sorted(output.iterdir()):
        with path.open("rb") as source:
            checksums.append(f"{hashlib.file_digest(source, 'sha256').hexdigest()}  {path.name}\n")
    (output / "SHA256SUMS").write_text("".join(checksums), encoding="utf-8")
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Collect complete native CI packages and checksums")
    parser.add_argument("kind", choices=KINDS)
    parser.add_argument("--output", type=Path)
    arguments = parser.parse_args()
    repository = Path(__file__).resolve().parents[1]
    destination = arguments.output or repository / "native-artifacts" / arguments.kind
    print(collect(arguments.kind, repository, destination))
