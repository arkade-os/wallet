import importlib.metadata
import json
from pathlib import Path
import shutil
import sys
import sysconfig


def python_license_candidates(prefix, stdlib, platform, version, docs=Path("/usr/share/doc")):
    candidates = [prefix / "LICENSE.txt", prefix / "LICENSE", stdlib / "LICENSE.txt", stdlib / "LICENSE"]
    if platform == "darwin":
        candidates.append(prefix / "Resources" / "English.lproj" / "License.rtf")
    if platform == "linux":
        candidates.extend(docs / package / "copyright" for package in (
            f"python{version}", f"libpython{version}-stdlib", f"python{version}-minimal", "python3"))
    return candidates


def find_python_license(candidates):
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise RuntimeError("Python license was not found in its installation or standard package documentation")


def main():
    python_license = find_python_license(python_license_candidates(
        Path(sys.base_prefix), Path(sysconfig.get_path("stdlib")), sys.platform,
        f"{sys.version_info.major}.{sys.version_info.minor}"))
    destination = Path(__file__).resolve().parents[1] / "resources" / "licenses"
    destination.mkdir(parents=True, exist_ok=True)
    packages = []
    for distribution in importlib.metadata.distributions():
        name = distribution.metadata["Name"]
        packages.append({"name": name, "version": distribution.version,
                         "projectUrls": distribution.metadata.get_all("Project-URL") or []})
        for entry in distribution.files or []:
            if not entry.name.lower().startswith(("license", "licence", "copying", "notice")):
                continue
            source = Path(distribution.locate_file(entry))
            if not source.is_file():
                continue
            package_directory = destination / name
            package_directory.mkdir(exist_ok=True)
            shutil.copyfile(source, package_directory / entry.name)
    suffix = ".rtf" if python_license.suffix.lower() == ".rtf" else ".txt"
    shutil.copyfile(python_license, destination / f"LICENSE-Python{suffix}")
    (destination / "packages.json").write_text(json.dumps(packages, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
