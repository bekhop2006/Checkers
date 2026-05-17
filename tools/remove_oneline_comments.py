from __future__ import annotations

import argparse
from pathlib import Path


COMMENT_LINE_PATTERNS: dict[str, list[str]] = {
    # Strip only *standalone* single-line comments (not inline trailing comments).
    ".py": ["#"],
    ".js": ["//"],
    ".jsx": ["//"],
    ".ts": ["//"],
    ".tsx": ["//"],
    ".css": ["/*"],
    ".scss": ["//", "/*"],
}

SKIP_DIRS = {
    ".git",
    ".venv",
    "venv",
    "node_modules",
    "dist",
    "build",
    "__pycache__",
}


def is_standalone_comment_line(line: str, markers: list[str]) -> bool:
    stripped = line.lstrip()
    if stripped == "" or stripped == "\n":
        return False
    for m in markers:
        if stripped.startswith(m):
            # JS/CSS block comment single-liners: only remove if it ends on the same line.
            if m == "/*":
                return "*/" in stripped
            return True
    return False


def process_file(path: Path, *, dry_run: bool) -> tuple[bool, int]:
    suffix = path.suffix.lower()
    markers = COMMENT_LINE_PATTERNS.get(suffix)
    if not markers:
        return (False, 0)

    original = path.read_text(encoding="utf-8")
    lines = original.splitlines(keepends=True)

    removed = 0
    kept: list[str] = []
    for i, line in enumerate(lines):
        # Preserve shebang on the first line in Python scripts.
        if i == 0 and suffix == ".py" and line.startswith("#!"):
            kept.append(line)
            continue
        if is_standalone_comment_line(line, markers):
            removed += 1
            continue
        kept.append(line)

    if removed == 0:
        return (False, 0)

    updated = "".join(kept)
    if not dry_run:
        path.write_text(updated, encoding="utf-8")
    return (True, removed)


def iter_targets(root: Path) -> list[Path]:
    targets: list[Path] = []
    for ext in COMMENT_LINE_PATTERNS:
        for path in root.rglob(f"*{ext}"):
            if not path.is_file():
                continue
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            targets.append(path)
    return targets


def main() -> int:
    parser = argparse.ArgumentParser(description="Remove standalone single-line comments.")
    parser.add_argument("--root", default=".", help="Root directory to scan")
    parser.add_argument("--dry-run", action="store_true", help="Report changes without writing")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    changed_files = 0
    removed_total = 0
    for path in iter_targets(root):
        changed, removed = process_file(path, dry_run=args.dry_run)
        if changed:
            changed_files += 1
            removed_total += removed
            print(f"{path.relative_to(root)}: removed {removed}")

    print(f"Done. Files changed: {changed_files}. Comment lines removed: {removed_total}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
