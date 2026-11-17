#!/usr/bin/env python3
"""Parse adb getevent -lt log into tap list with delays (for Maestro flows)."""

import re
import sys
from pathlib import Path

# goodix_ts defaults; override via argv 5-6 if needed
DEFAULT_TOUCH_MAX_X = 12200
DEFAULT_TOUCH_MAX_Y = 27120


def parse(
    raw_path: Path,
    screen_w: int,
    screen_h: int,
    touch_max_x: int = DEFAULT_TOUCH_MAX_X,
    touch_max_y: int = DEFAULT_TOUCH_MAX_Y,
) -> str:
    lines = raw_path.read_text(errors="replace").splitlines()
    ts_re = re.compile(r"^\[\s*([\d.]+)\]")
    taps: list[tuple[float, int, int]] = []
    x = y = None
    ts = 0.0

    for line in lines:
        if "/dev/input/event" not in line:
            continue
        tsm = ts_re.search(line)
        if tsm:
            ts = float(tsm.group(1))
        if "ABS_MT_POSITION_X" in line:
            x = int(line.split()[-1], 16)
        elif "ABS_MT_POSITION_Y" in line:
            y = int(line.split()[-1], 16)
        elif "BTN_TOUCH" in line and "UP" in line and x is not None and y is not None:
            taps.append((ts, x, y))
            x = y = None

    if not taps:
        return "No taps detected in recording.\n"

    def pct(raw_x: int, raw_y: int) -> tuple[int, int]:
        # Maestro point taps require integer percentages (decimals fail to parse).
        return (
            round(raw_x / touch_max_x * 100),
            round(raw_y / touch_max_y * 100),
        )

    out: list[str] = [
        f"# taps from {raw_path.name}",
        f"# touch max {touch_max_x}x{touch_max_y}  screen {screen_w}x{screen_h}",
        "",
    ]

    for i, (t, px, py) in enumerate(taps, 1):
        delay_ms = int((t - taps[i - 2][0]) * 1000) if i > 1 else 0
        cx, cy = pct(px, py)
        out.append(
            f"tap {i}: raw ({px}, {py})  point ({cx}%, {cy}%)  "
            f"delay_after_prev_ms={delay_ms}"
        )

    out.append("")
    out.append("# Maestro snippets:")
    for i, (t, px, py) in enumerate(taps, 1):
        if i > 1:
            delay_ms = int((t - taps[i - 2][0]) * 1000)
            if delay_ms >= 500:
                seconds = max(1, round(delay_ms / 1000))
                out.append(f"- runFlow: wait_{seconds}s.yaml")
        cx, cy = pct(px, py)
        out.append("- tapOn:")
        out.append(f'    point: "{cx}%, {cy}%"')

    out.append("")
    return "\n".join(out)


def main() -> None:
    if len(sys.argv) not in (4, 6):
        print(
            "usage: parse-taps.py <raw.log> <screen_w> <screen_h> [touch_max_x touch_max_y]",
            file=sys.stderr,
        )
        sys.exit(1)
    try:
        screen_w = int(sys.argv[2])
        screen_h = int(sys.argv[3])
        touch_x = int(sys.argv[4]) if len(sys.argv) == 6 else DEFAULT_TOUCH_MAX_X
        touch_y = int(sys.argv[5]) if len(sys.argv) == 6 else DEFAULT_TOUCH_MAX_Y
    except ValueError as exc:
        print(f"error: all numeric arguments must be integers: {exc}", file=sys.stderr)
        sys.exit(1)
    print(parse(Path(sys.argv[1]), screen_w, screen_h, touch_x, touch_y))


if __name__ == "__main__":
    main()
