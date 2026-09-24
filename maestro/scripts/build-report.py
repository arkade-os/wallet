#!/usr/bin/env python3
"""Build a Markdown Maestro test report from JUnit XML and debug artifacts."""

from __future__ import annotations

import argparse
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


@dataclass
class Case:
    name: str
    classname: str
    time: float
    status: str
    message: str
    details: str


def parse_junit(path: Path) -> list[Case]:
    if not path.is_file():
        return [
            Case(
                name="maestro-run",
                classname="",
                time=0.0,
                status="error",
                message="JUnit file not produced",
                details=f"Expected at {path}",
            )
        ]

    root = ET.parse(path).getroot()
    cases: list[Case] = []

    for suite in root.iter("testsuite"):
        for tc in suite.iter("testcase"):
            name = tc.attrib.get("name", "unknown")
            classname = tc.attrib.get("classname", "")
            try:
                elapsed = float(tc.attrib.get("time", "0") or 0)
            except ValueError:
                elapsed = 0.0

            failure = tc.find("failure")
            error = tc.find("error")
            skipped = tc.find("skipped")

            if failure is not None:
                cases.append(
                    Case(
                        name=name,
                        classname=classname,
                        time=elapsed,
                        status="failed",
                        message=failure.attrib.get("message", "failure"),
                        details=(failure.text or "").strip(),
                    )
                )
            elif error is not None:
                cases.append(
                    Case(
                        name=name,
                        classname=classname,
                        time=elapsed,
                        status="error",
                        message=error.attrib.get("message", "error"),
                        details=(error.text or "").strip(),
                    )
                )
            elif skipped is not None:
                cases.append(
                    Case(
                        name=name,
                        classname=classname,
                        time=elapsed,
                        status="skipped",
                        message=skipped.attrib.get("message", "skipped"),
                        details=(skipped.text or "").strip(),
                    )
                )
            else:
                cases.append(
                    Case(
                        name=name,
                        classname=classname,
                        time=elapsed,
                        status="passed",
                        message="",
                        details="",
                    )
                )

    if not cases and root.tag == "testsuite":
        for tc in root.iter("testcase"):
            cases.extend(parse_junit_cases_from_element(tc))

    return cases


def parse_junit_cases_from_element(tc: ET.Element) -> list[Case]:
    name = tc.attrib.get("name", "unknown")
    classname = tc.attrib.get("classname", "")
    try:
        elapsed = float(tc.attrib.get("time", "0") or 0)
    except ValueError:
        elapsed = 0.0
    failure = tc.find("failure")
    if failure is not None:
        return [
            Case(
                name=name,
                classname=classname,
                time=elapsed,
                status="failed",
                message=failure.attrib.get("message", "failure"),
                details=(failure.text or "").strip(),
            )
        ]
    return [
        Case(
            name=name,
            classname=classname,
            time=elapsed,
            status="passed",
            message="",
            details="",
        )
    ]


def find_screenshots(debug_dir: Path) -> list[Path]:
    if not debug_dir.is_dir():
        return []
    return sorted(debug_dir.rglob("*.png"))


def rel(path: Path, base: Path) -> str:
    try:
        return str(path.relative_to(base))
    except ValueError:
        return str(path)


def build_markdown(
    *,
    scenario: str,
    wallet_url: str,
    device: str,
    flows: list[str],
    duration: int,
    maestro_exit: int,
    junit: Path,
    debug_dir: Path,
    output: Path,
) -> str:
    cases = parse_junit(junit)
    if not cases:
        for tc in ET.parse(junit).getroot().iter("testcase") if junit.is_file() else []:
            cases.extend(parse_junit_cases_from_element(tc))

    passed = [c for c in cases if c.status == "passed"]
    failed = [c for c in cases if c.status in ("failed", "error")]
    skipped = [c for c in cases if c.status == "skipped"]
    screenshots = find_screenshots(debug_dir)
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    report_dir = output.parent

    lines = [
        f"# Maestro report — {scenario}",
        "",
        f"**Generated:** {now}  ",
        f"**Device:** `{device}`  ",
        f"**WALLET_URL:** `{wallet_url}`  ",
        f"**Duration:** {duration}s  ",
        f"**Maestro exit code:** {maestro_exit}  ",
        f"**Result:** {len(passed)} passed, {len(failed)} failed, {len(skipped)} skipped",
        "",
        "## Flows",
        "",
    ]
    for flow in flows:
        lines.append(f"- `{flow}`")
    lines.append("")

    if failed:
        lines.extend(["## Failed", ""])
        for c in failed:
            lines.append(f"### {c.name}")
            if c.classname:
                lines.append(f"- **Class:** `{c.classname}`")
            lines.append(f"- **Status:** {c.status}")
            lines.append(f"- **Time:** {c.time:.2f}s")
            if c.message:
                lines.append(f"- **Message:** {c.message}")
            if c.details:
                lines.append("")
                lines.append("```")
                lines.append(c.details[:4000])
                lines.append("```")
            lines.append("")

    if passed:
        lines.extend(["## Passed", ""])
        lines.append("| Test | Time |")
        lines.append("|------|------|")
        for c in passed:
            lines.append(f"| {c.name} | {c.time:.2f}s |")
        lines.append("")

    if skipped:
        lines.extend(["## Skipped", ""])
        for c in skipped:
            lines.append(f"- {c.name}: {c.message}")
        lines.append("")

    if screenshots:
        lines.extend(["## Debug screenshots", ""])
        for shot in screenshots[-20:]:
            lines.append(f"- [{shot.name}]({rel(shot, report_dir)})")
        if len(screenshots) > 20:
            lines.append(f"- _…and {len(screenshots) - 20} more in `{rel(debug_dir, report_dir)}`_")
        lines.append("")

    lines.extend(
        [
            "## Artifacts",
            "",
            f"- JUnit: `{rel(junit, report_dir)}`",
            f"- Debug output: `{rel(debug_dir, report_dir)}`",
            "",
        ]
    )

    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario", required=True)
    parser.add_argument("--junit", required=True)
    parser.add_argument("--debug-dir", required=True)
    parser.add_argument("--wallet-url", required=True)
    parser.add_argument("--device", required=True)
    parser.add_argument("--flows", nargs="+", required=True)
    parser.add_argument("--duration", type=int, required=True)
    parser.add_argument("--maestro-exit", type=int, required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    md = build_markdown(
        scenario=args.scenario,
        wallet_url=args.wallet_url,
        device=args.device,
        flows=args.flows,
        duration=args.duration,
        maestro_exit=args.maestro_exit,
        junit=Path(args.junit),
        debug_dir=Path(args.debug_dir),
        output=output,
    )
    output.write_text(md, encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
