import copy
import os
from pathlib import Path
import plistlib
import re
import stat
import sys
import tempfile


def merge_strings(current, required, name):
    if not isinstance(current, list) or any(not isinstance(value, str) for value in current):
        raise ValueError(f"Expected an array of strings for {name}")
    return current + [value for value in required if value not in current]


def merge_info(current, required):
    result = copy.deepcopy(current)
    for key in ("NFCReaderUsageDescription", "NSCameraUsageDescription"):
        if key in result and (not isinstance(result[key], str) or not result[key].strip()):
            raise ValueError(f"Invalid existing {key}; resolve it in Xcode before preparing")
        result.setdefault(key, required[key])
    aid = "com.apple.developer.nfc.readersession.iso7816.select-identifiers"
    result[aid] = merge_strings(result.get(aid, []), required[aid], aid)
    for key in ("UIFileSharingEnabled", "LSSupportsOpeningDocumentsInPlace"):
        if key in result and result[key] is not False:
            raise ValueError(f"{key} must remain false; existing project was preserved")
        result[key] = False
    types = result.setdefault("CFBundleURLTypes", [])
    if not isinstance(types, list) or any(not isinstance(value, dict) for value in types):
        raise ValueError("Invalid existing CFBundleURLTypes")
    entry = required["CFBundleURLTypes"][0]
    matching = [value for value in types if value.get("CFBundleURLName") == entry["CFBundleURLName"]]
    if len(matching) > 1:
        raise ValueError("Duplicate Arkade URL declarations; existing project was preserved")
    if matching:
        matching[0]["CFBundleURLSchemes"] = merge_strings(
            matching[0].get("CFBundleURLSchemes", []), entry["CFBundleURLSchemes"], "CFBundleURLSchemes"
        )
    else:
        types.append(copy.deepcopy(entry))
    return result


def merge_entitlements(current, required):
    result = copy.deepcopy(current)
    key = "com.apple.developer.nfc.readersession.formats"
    result[key] = merge_strings(result.get(key, []), required[key], key)
    return result


def read_plist(path):
    if path.is_symlink() or not path.is_file():
        raise ValueError(f"Expected a regular generated plist: {path}")
    with path.open("rb") as source:
        value = plistlib.load(source)
    if not isinstance(value, dict):
        raise ValueError(f"Expected a plist dictionary: {path}")
    return value


def write_plist(path, value):
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".arkade-", delete=False) as output:
            temporary = Path(output.name)
            plistlib.dump(value, output, sort_keys=False)
            output.flush()
            os.fsync(output.fileno())
        temporary.chmod(stat.S_IMODE(path.stat().st_mode) if path.exists() else 0o600)
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def prepare(project, check=False, source=None):
    source = Path(source) if source else Path(__file__).resolve().parent
    project = Path(project).resolve(strict=True)
    apps = [path for path in project.glob("*_iOS") if path.is_dir()]
    projects = list(project.glob("*.xcodeproj/project.pbxproj"))
    if len(apps) != 1 or len(projects) != 1:
        raise ValueError("Expected one Tauri iOS app and Xcode project; no project files were regenerated")
    app = apps[0]
    if app.is_symlink() or app.resolve().parent != project:
        raise ValueError("Generated iOS app directory must remain within the project")
    pbx = projects[0].read_text(encoding="utf-8")
    entitlement_path = f"{app.name}/{app.name}.entitlements"
    settings = re.findall(r'CODE_SIGN_ENTITLEMENTS\s*=\s*"?([^";\n]+)"?\s*;', pbx)
    if not settings or any(value.strip() != entitlement_path for value in settings):
        raise ValueError("Xcode must reference Tauri's generated entitlements path; existing settings were preserved")
    versions = re.findall(r'IPHONEOS_DEPLOYMENT_TARGET\s*=\s*"?([\d.]+)"?\s*;', pbx)
    if not versions or any(tuple((list(map(int, value.split("."))) + [0])[:2]) < (14, 0) for value in versions):
        raise ValueError("Set the existing Xcode deployment target to iOS 14.0 or newer before building")
    info_path = app / "Info.plist"
    entitlements_path = app / f"{app.name}.entitlements"
    if entitlements_path.is_symlink():
        raise ValueError("Generated entitlements must be a regular file")
    info = read_plist(info_path)
    entitlements = read_plist(entitlements_path) if entitlements_path.exists() else {}
    prepared_info = merge_info(info, read_plist(source / "Info.plist"))
    prepared_entitlements = merge_entitlements(entitlements, read_plist(source / "Entitlements.plist"))
    changes = [(info_path, info, prepared_info), (entitlements_path, entitlements, prepared_entitlements)]
    if check and any(old != new for _, old, new in changes):
        raise ValueError("iOS metadata needs preparation; run pnpm native:ios:prepare")
    for path, old, new in changes:
        if old != new:
            write_plist(path, new)


if __name__ == "__main__":
    try:
        arguments = sys.argv[1:]
        check = "--check" in arguments
        paths = [value for value in arguments if value != "--check"]
        if len(paths) > 1:
            raise ValueError("Usage: prepare-host.py [project-directory] [--check]")
        prepare(paths[0] if paths else Path(__file__).resolve().parents[1] / "gen/apple", check)
        print("iOS metadata verified." if check else "iOS metadata prepared; existing Xcode project retained.")
    except Exception as error:
        print(f"iOS preparation failed: {error}", file=sys.stderr)
        sys.exit(1)
