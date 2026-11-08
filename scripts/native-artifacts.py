import argparse
import hashlib
import json
import os
from pathlib import Path
import plistlib
import shutil
import struct
import subprocess
import tarfile
import zipfile


KINDS = ("windows", "linux", "macos", "android", "ios-simulator", "ios-device")
ANDROID_ABIS = ("arm64-v8a", "armeabi-v7a", "x86", "x86_64")
ANDROID_ARCHES = {"arm64": ("arm64", "arm64-v8a", 183),
                  "armv7": ("arm", "armeabi-v7a", 40),
                  "i686": ("x86", "x86", 3),
                  "x86_64": ("x86_64", "x86_64", 62)}


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


def verify_abi(binary, machine):
    if len(binary) < 52 or binary[:6] not in (b"\x7fELF\x02\x01", b"\x7fELF\x01\x01") or binary[6] != 1:
        raise ValueError("Expected a little-endian native ELF library")
    section_format = "<IIQQQQIIQQ" if binary[4] == 2 else "<IIIIIIIIII"
    expected_size = struct.calcsize(section_format)
    header_format = "<HHIQQQIHHHHHH" if binary[4] == 2 else "<HHIIIIIHHHHHH"
    if len(binary) < 16 + struct.calcsize(header_format):
        raise ValueError("Expected a complete native ELF header")
    (elf_type, machine_id, *_, sections_offset, _, _, _, _, entry_size,
     section_count, names_index) = struct.unpack_from(header_format, binary, 16)
    if elf_type != 3 or machine_id != machine:
        raise ValueError("Native library ABI does not match the requested package")
    if section_count == 0 and sections_offset == 0 and entry_size == 0:
        return
    def section(index):
        offset = sections_offset + index * entry_size
        if offset + expected_size > len(binary):
            raise ValueError("Invalid native library section table")
        return struct.unpack_from(section_format, binary, offset)

    if entry_size != expected_size or section_count == 0 or names_index >= section_count:
        raise ValueError("Invalid native library section table")
    names = section(names_index)
    if names[4] + names[5] > len(binary):
        raise ValueError("Invalid native library section names")
    section_names = binary[names[4]:names[4] + names[5]]
    for index in range(section_count):
        fields = section(index)
        if fields[0] >= len(section_names) or b"\0" not in section_names[fields[0]:]:
            raise ValueError("Invalid native library section name")
        name = section_names[fields[0]:].split(b"\0", 1)[0]
        if fields[1] == 2 or name.startswith((b".debug_", b".stab", b".symtab", b".strtab")):
            raise ValueError("Release native library still contains debug symbols")


def collect_android_abi(target, root, output):
    target, root, output = str(target), Path(root), Path(output)
    if target not in ANDROID_ARCHES:
        raise ValueError(f"Unknown Android ABI: {target}")
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        raise ValueError(f"Artifact destination must be empty: {output}")
    directory, abi, machine = ANDROID_ARCHES[target]
    releases = list((root / f"src-tauri/gen/android/app/build/outputs/apk/{directory}/release").glob(
        f"app-{directory}-release*.apk"))
    if len(releases) != 1:
        raise ValueError(f"Expected one release APK for {directory}; found {len(releases)}")
    expected = releases[0]
    with zipfile.ZipFile(expected) as source:
        libraries = []
        for info in source.infolist():
            if info.filename.startswith("lib/") and not info.filename.startswith(f"lib/{abi}/"):
                if any(info.filename.startswith(f"lib/{other}/") for other in ANDROID_ABIS):
                    raise ValueError("APK contains an unexpected native library architecture")
            elif info.filename.startswith("lib/"):
                verify_abi(source.read(info), machine)
            libraries.append(info.filename)
        if f"lib/{abi}/libarkade_native_lib.so" not in libraries:
            raise ValueError(f"Release APK is missing {abi}")
    output.mkdir(parents=True, exist_ok=True)
    shutil.copy2(expected, output / f"Arkade-android-{target}-release-unsigned.apk")
    metadata = {"kind": "android", "abi": abi,
                "commit": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root, text=True).strip(),
                "run_id": os.environ.get("GITHUB_RUN_ID"), "ref": os.environ.get("GITHUB_REF")}
    (output / "SOURCE.json").write_text(json.dumps(metadata, indent=2) + "\n")
    with (output / "SHA256SUMS").open("w") as checksums:
        for path in sorted(output.iterdir()):
            if path.is_file() and path.name != "SHA256SUMS":
                with path.open("rb") as source:
                    checksums.write(f"{hashlib.file_digest(source, 'sha256').hexdigest()}  {path.name}\n")
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Collect complete native CI packages and checksums")
    parser.add_argument("kind", choices=KINDS + tuple("android-abi/" + target for target in ANDROID_ARCHES))
    parser.add_argument("--output", type=Path)
    arguments = parser.parse_args()
    repository = Path(__file__).resolve().parents[1]
    destination = arguments.output or repository / "native-artifacts" / arguments.kind.split("/")[-1]
    if arguments.kind.startswith("android-abi/"):
        print(collect_android_abi(arguments.kind.split("/", 1)[1], repository, destination))
    else:
        print(collect(arguments.kind, repository, destination))
