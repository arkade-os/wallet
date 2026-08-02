#!/usr/bin/env python3
"""
Remap Maestro percentage coordinates from the source device profile to a target profile.

Flows are stored as integer percentages (e.g. point: "50%, 88%"). The reference suite
was recorded on Xiaomi 13T Pro with a 3-button navigation bar. Different resolutions
or navigation modes change the usable Chrome viewport; this tool maps taps/swipes through
content and chrome regions defined in device-profiles.yaml.

Usage:
  ./maestro/scripts/adapt-device.py --list-profiles
  ./maestro/scripts/adapt-device.py --detect [--device SERIAL]
  ./maestro/scripts/adapt-device.py --to-profile example-gesture-1220x2712 --dry-run
  ./maestro/scripts/adapt-device.py --to-profile my-pixel --write --backup
  ./maestro/scripts/adapt-device.py --init-profile my-pixel --device SERIAL --write-profile
"""

from __future__ import annotations

import argparse
import copy
import re
import subprocess
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    yaml = None  # type: ignore

MAESTRO_DIR = Path(__file__).resolve().parents[1]
PROFILES_PATH = MAESTRO_DIR / "device-profiles.yaml"
FLOW_DIRS = [
    MAESTRO_DIR / "complete-tests",
]

PCT_RE = re.compile(r'^(\d+)%$')
COORD_LINE_RE = re.compile(
    r'^(\s*)(point|start|end):\s*"(\d+)%,\s*(\d+)%"\s*$'
)

NAVIGATION_MODES = {
    "0": "three_button",
    "1": "two_button",
    "2": "gesture",
}

# Default viewport/chrome when auto-detecting from adb
NAV_PRESETS: dict[str, dict[str, Any]] = {
    "three_button": {
        "viewport": {"top_pct": 5, "bottom_pct": 92, "left_pct": 0, "right_pct": 100},
        "chrome": {
            "header_y_max_pct": 18,
            "side_x_max_pct": 12,
            "nav_bar_y_min_pct": 92,
        },
    },
    "gesture": {
        "viewport": {"top_pct": 5, "bottom_pct": 97, "left_pct": 0, "right_pct": 100},
        "chrome": {
            "header_y_max_pct": 18,
            "side_x_max_pct": 12,
            "nav_bar_y_min_pct": 97,
        },
    },
    "two_button": {
        "viewport": {"top_pct": 5, "bottom_pct": 93, "left_pct": 0, "right_pct": 100},
        "chrome": {
            "header_y_max_pct": 18,
            "side_x_max_pct": 12,
            "nav_bar_y_min_pct": 93,
        },
    },
}


def load_profiles(path: Path) -> dict[str, Any]:
    if yaml is None:
        sys.exit("error: PyYAML required — pip install pyyaml")
    data = yaml.safe_load(path.read_text())
    if not data or "profiles" not in data:
        sys.exit(f"error: invalid profiles file: {path}")
    return data


def save_profiles(path: Path, data: dict[str, Any]) -> None:
    if yaml is None:
        sys.exit("error: PyYAML required — pip install pyyaml")
    path.write_text(yaml.safe_dump(data, sort_keys=False, default_flow_style=False))


def adb_shell(device: str | None, *args: str) -> str:
    cmd = ["adb"]
    if device:
        cmd.extend(["-s", device])
    cmd.extend(["shell", *args])
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        sys.exit(f"error: adb failed: {' '.join(cmd)}\n{result.stderr}")
    return result.stdout.strip().replace("\r", "")


def adb_devices() -> list[str]:
    out = subprocess.run(["adb", "devices"], capture_output=True, text=True, check=True)
    serials = []
    for line in out.stdout.splitlines()[1:]:
        parts = line.split()
        if len(parts) >= 2 and parts[1] == "device":
            serials.append(parts[0])
    return serials


def resolve_device(device: str | None) -> str:
    if device:
        return device
    devices = adb_devices()
    if not devices:
        sys.exit("error: no adb device connected")
    if len(devices) > 1:
        sys.exit(f"error: multiple devices — pass --device ({', '.join(devices)})")
    return devices[0]


def parse_wm_size(raw: str) -> tuple[int, int]:
    # Physical size: 1220x2712  or Override size: ...
    for line in raw.splitlines():
        if "size:" in line.lower():
            token = line.split(":")[-1].strip()
            if "x" in token:
                w, h = token.split("x", 1)
                return int(w), int(h)
    sys.exit(f"error: could not parse wm size:\n{raw}")


def detect_profile(device: str | None) -> dict[str, Any]:
    serial = resolve_device(device)
    wm = adb_shell(serial, "wm", "size")
    w, h = parse_wm_size(wm)
    nav_raw = adb_shell(serial, "settings", "get", "secure", "navigation_mode")
    nav = NAVIGATION_MODES.get(nav_raw, "gesture")
    model = adb_shell(serial, "getprop", "ro.product.model")
    manufacturer = adb_shell(serial, "getprop", "ro.product.manufacturer")
    preset = NAV_PRESETS[nav]
    # Touch digitizer max: common 10x scaling from screen px on many devices
    touch_x = w * 10
    touch_y = h * 10
    slug = re.sub(r"[^a-z0-9]+", "-", f"{manufacturer}-{model}-{w}x{h}-{nav}".lower()).strip("-")
    return {
        "id": slug,
        "label": f"{manufacturer} {model}".strip(),
        "adb_serial": serial,
        "screen_width": w,
        "screen_height": h,
        "navigation": nav,
        "touch_digitizer_max_x": touch_x,
        "touch_digitizer_max_y": touch_y,
        "viewport": copy.deepcopy(preset["viewport"]),
        "chrome": copy.deepcopy(preset["chrome"]),
    }


def clamp_pct(value: int) -> int:
    return max(0, min(100, value))


def in_chrome_zone(x: int, y: int, chrome: dict[str, Any]) -> bool:
    return (
        y <= chrome["header_y_max_pct"]
        or y >= chrome["nav_bar_y_min_pct"]
        or x <= chrome["side_x_max_pct"]
    )


def map_axis(value: int, src_min: int, src_max: int, dst_min: int, dst_max: int) -> int:
    if src_max <= src_min:
        return clamp_pct(value)
    norm = (value - src_min) / (src_max - src_min)
    return clamp_pct(round(dst_min + norm * (dst_max - dst_min)))


def map_coordinate(
    x: int,
    y: int,
    src: dict[str, Any],
    dst: dict[str, Any],
) -> tuple[int, int]:
    src_chrome = src["chrome"]
    dst_chrome = dst["chrome"]
    src_vp = src["viewport"]
    dst_vp = dst["viewport"]

    if in_chrome_zone(x, y, src_chrome) or in_chrome_zone(x, y, dst_chrome):
        # Status bar, nav bar, header back — scale across full screen percentages
        src_w = src["screen_width"]
        src_h = src["screen_height"]
        dst_w = dst["screen_width"]
        dst_h = dst["screen_height"]
        new_x = clamp_pct(round(x * dst_w / src_w)) if src_w else x
        new_y = clamp_pct(round(y * dst_h / src_h)) if src_h else y
        return new_x, new_y

    new_x = map_axis(x, src_vp["left_pct"], src_vp["right_pct"], dst_vp["left_pct"], dst_vp["right_pct"])
    new_y = map_axis(y, src_vp["top_pct"], src_vp["bottom_pct"], dst_vp["top_pct"], dst_vp["bottom_pct"])
    return new_x, new_y


def transform_line(line: str, src: dict[str, Any], dst: dict[str, Any]) -> tuple[str, bool]:
    m = COORD_LINE_RE.match(line)
    if not m:
        return line, False
    indent, key, x_s, y_s = m.groups()
    x, y = int(x_s), int(y_s)
    nx, ny = map_coordinate(x, y, src, dst)
    if nx == x and ny == y:
        return line, False
    return f'{indent}{key}: "{nx}%, {ny}%"', True


def transform_file(path: Path, src: dict[str, Any], dst: dict[str, Any]) -> tuple[str, int]:
    text = path.read_text()
    lines = text.splitlines(keepends=True)
    changes = 0
    out: list[str] = []
    for line in lines:
        # preserve newline via splitlines(keepends=True) — line includes \n or not
        bare = line.rstrip("\n")
        suffix = line[len(bare):]
        new_line, changed = transform_line(bare, src, dst)
        if changed:
            changes += 1
        out.append(new_line + suffix)
    return "".join(out), changes


def iter_flow_yaml_files() -> list[Path]:
    files: list[Path] = []
    for root in FLOW_DIRS:
        if not root.exists():
            continue
        files.extend(sorted(root.rglob("*.yaml")))
    return files


def profile_by_id(data: dict[str, Any], profile_id: str) -> dict[str, Any]:
    profiles = data["profiles"]
    if profile_id not in profiles:
        known = ", ".join(sorted(profiles))
        sys.exit(f"error: unknown profile '{profile_id}' — known: {known}")
    return profiles[profile_id]


def main() -> None:
    parser = argparse.ArgumentParser(description="Adapt Maestro flows to another Android device profile")
    parser.add_argument("--profiles", type=Path, default=PROFILES_PATH, help="device-profiles.yaml path")
    parser.add_argument("--from-profile", help="source profile id (default: source.profile in yaml)")
    parser.add_argument("--to-profile", help="target profile id to map coordinates to")
    parser.add_argument("--device", help="adb serial for --detect / --init-profile")
    parser.add_argument("--list-profiles", action="store_true", help="list profile ids")
    parser.add_argument("--detect", action="store_true", help="print profile detected from connected device")
    parser.add_argument("--init-profile", metavar="ID", help="add profile from connected device (see --write-profile)")
    parser.add_argument("--write-profile", action="store_true", help="save --init-profile into device-profiles.yaml")
    parser.add_argument("--dry-run", action="store_true", help="show summary without writing files")
    parser.add_argument("--write", action="store_true", help="rewrite flow yaml files in place")
    parser.add_argument("--backup", action="store_true", help="with --write, keep .bak copies")
    args = parser.parse_args()

    data = load_profiles(args.profiles)

    if args.list_profiles:
        for pid, profile in data["profiles"].items():
            tag = " (source)" if pid == data.get("source", {}).get("profile") else ""
            print(f"{pid}: {profile.get('label', pid)}{tag}")
        return

    if args.detect or args.init_profile:
        detected = detect_profile(args.device)
        if args.detect and not args.init_profile:
            print(yaml.safe_dump({"profile": detected}, sort_keys=False, default_flow_style=False))
            return
        if args.init_profile:
            pid = args.init_profile
            entry = {
                "label": detected["label"],
                "screen_width": detected["screen_width"],
                "screen_height": detected["screen_height"],
                "navigation": detected["navigation"],
                "touch_digitizer_max_x": detected["touch_digitizer_max_x"],
                "touch_digitizer_max_y": detected["touch_digitizer_max_y"],
                "viewport": detected["viewport"],
                "chrome": detected["chrome"],
            }
            if args.write_profile:
                data["profiles"][pid] = entry
                save_profiles(args.profiles, data)
                print(f"saved profile '{pid}' to {args.profiles}")
            else:
                print(yaml.safe_dump({pid: entry}, sort_keys=False, default_flow_style=False))
            return

    if not args.to_profile:
        parser.error("one of --to-profile, --detect, --init-profile, or --list-profiles is required")

    src_id = args.from_profile or data.get("source", {}).get("profile", "xiaomi-13t-pro")
    dst_id = args.to_profile
    src = profile_by_id(data, src_id)
    dst = profile_by_id(data, dst_id)

    if src_id == dst_id:
        print(f"source and target are both '{src_id}' — nothing to do")
        return

    if not args.dry_run and not args.write:
        parser.error("pass --dry-run and/or --write")

    total_files = 0
    total_changes = 0
    for path in iter_flow_yaml_files():
        new_text, changes = transform_file(path, src, dst)
        if changes == 0:
            continue
        total_files += 1
        total_changes += changes
        rel = path.relative_to(MAESTRO_DIR)
        print(f"{rel}: {changes} coordinate(s)")
        if args.write:
            if args.backup:
                backup = path.with_suffix(path.suffix + ".bak")
                backup.write_text(path.read_text())
            path.write_text(new_text)

    print("")
    print(f"Mapped {src_id} → {dst_id}")
    print(f"  files touched: {total_files}")
    print(f"  coordinates updated: {total_changes}")
    if args.dry_run and not args.write:
        print("  (dry-run — no files modified)")
    elif args.write:
        print("  written to disk")
        print("  re-run a smoke flow on the target device and adjust device-profiles.yaml if needed")


if __name__ == "__main__":
    main()
