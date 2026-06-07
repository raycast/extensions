#!/usr/bin/env python3
"""
Raycast screenshot validator
Checks image dimensions and padding symmetry.

Usage:
  python3 check_raycast_images.py image1.png image2.jpg https://example.com/img.png
  python3 check_raycast_images.py ./metadata/*.png --verbose
  python3 check_raycast_images.py --dir ./extensions/metadata --recursive
"""

import sys
import argparse
import urllib.request
import tempfile
import os
from pathlib import Path

import numpy as np
from PIL import Image

EXPECTED_WIDTH = 2000
EXPECTED_HEIGHT = 1250
EXPECTED_PAD = 0.125
PAD_TOLERANCE = 0.045
MAX_ASYMMETRY = 0.04
DEFAULT_TOLERANCE = 35
SUPPORTED_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}


def load_image(path_or_url: str) -> Image.Image:
    if path_or_url.startswith("http://") or path_or_url.startswith("https://"):
        req = urllib.request.Request(
            path_or_url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; image-checker/1.0)"},
        )
        with urllib.request.urlopen(req) as resp:
            data = resp.read()
        suffix = ".png"
        for ext in [".jpg", ".jpeg", ".webp", ".gif"]:
            if ext in path_or_url.lower():
                suffix = ext
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        try:
            img = Image.open(tmp_path)
            return img.convert("RGB")
        finally:
            os.unlink(tmp_path)
    img = Image.open(path_or_url)
    return img.convert("RGB")


def _bbox_is_sane(top: int, left: int, bottom: int, right: int, h: int, w: int) -> bool:
    area_frac = ((bottom - top) * (right - left)) / (h * w)
    all_in_range = all(
        0 <= v <= 0.70
        for v in [
            top / h,
            (h - bottom - 1) / h,
            left / w,
            (w - right - 1) / w,
        ]
    )
    return area_frac > 0.05 and all_in_range


def _find_bbox_variance(
    arr: np.ndarray, std_threshold: float = 22.0, verbose: bool = False
) -> tuple[int, int, int, int] | None:
    h, w = arr.shape[:2]
    row_std = arr.reshape(h, -1).std(axis=1)
    col_std = arr.transpose(1, 0, 2).reshape(w, -1).std(axis=1)

    content_rows = np.where(row_std > std_threshold)[0]
    content_cols = np.where(col_std > std_threshold)[0]

    if verbose:
        print(
            "       Variance fallback — row std range: "
            f"{row_std.min():.1f}–{row_std.max():.1f}, "
            f"col std range: {col_std.min():.1f}–{col_std.max():.1f}, "
            f"threshold: {std_threshold}"
        )

    if len(content_rows) == 0 or len(content_cols) == 0:
        return None

    return (
        int(content_rows[0]),
        int(content_cols[0]),
        int(content_rows[-1]),
        int(content_cols[-1]),
    )


def find_window_bbox(
    arr: np.ndarray, tol: int = DEFAULT_TOLERANCE, verbose: bool = False
) -> tuple[int, int, int, int] | None:
    h, w = arr.shape[:2]
    n = 25
    grad_high = max(30, min(90, 105 - tol))
    grad_low = max(15, grad_high - 30)

    col_positions = np.linspace(int(w * 0.05), int(w * 0.95), n).astype(int)
    row_positions = np.linspace(int(h * 0.05), int(h * 0.95), n).astype(int)

    ctr_cols = col_positions[
        (col_positions >= int(w * 0.35)) & (col_positions <= int(w * 0.65))
    ]
    ctr_rows = row_positions[
        (row_positions >= int(h * 0.35)) & (row_positions <= int(h * 0.65))
    ]
    if ctr_cols.size < 3:
        ctr_cols = col_positions[n // 3 : -(n // 3)]
    if ctr_rows.size < 3:
        ctr_rows = row_positions[n // 3 : -(n // 3)]

    top_edges: list[int] = []
    left_edges: list[int] = []
    right_edges: list[int] = []
    bot_prel: list[int] = []

    cy0 = h // 2
    cx0 = w // 2

    for cx in ctr_cols:
        col = arr[:, cx].astype(np.int32)
        grad = np.max(np.abs(np.diff(col, axis=0)), axis=1)

        for y in range(cy0 - 1, -1, -1):
            if grad[y] > grad_high:
                top_edges.append(y + 1)
                break

        for y in range(cy0, h - 1):
            if grad[y] > grad_high:
                bot_prel.append(y)
                break

    for cy in ctr_rows:
        row = arr[cy, :].astype(np.int32)
        grad = np.max(np.abs(np.diff(row, axis=0)), axis=1)

        for x in range(cx0 - 1, -1, -1):
            if grad[x] > grad_high:
                left_edges.append(x + 1)
                break

        for x in range(cx0, w - 1):
            if grad[x] > grad_high:
                right_edges.append(x)
                break

    bdy = max(int(h * 0.01), 3)
    bdx = max(int(w * 0.01), 3)
    top_use = [e for e in top_edges if e > bdy] or top_edges
    left_use = [e for e in left_edges if e > bdx] or left_edges
    right_use = [e for e in right_edges if e < w - bdx] or right_edges

    if verbose:
        print(
            f"       Phase-1 (centre-out, grad>{grad_high}) — "
            f"top:{sorted(set(top_use))[:5]}… "
            f"left:{sorted(set(left_use))[:5]}… "
            f"right:{sorted(set(right_use))[-5:][::-1]}… "
            f"bot_prel:{sorted(set(bot_prel))[:5]}…"
        )

    if left_use and right_use:
        med_left = min(left_use)
        med_right = max(right_use)

        inner = col_positions[(col_positions >= med_left) & (col_positions <= med_right)]
        if inner.size < 3:
            inner = col_positions[n // 4 : -n // 4]

        top_search_limit = int(h * 0.35)
        top_p2: list[int] = []
        for cx in inner:
            col = arr[:, cx].astype(np.int32)
            grad = np.max(np.abs(np.diff(col, axis=0)), axis=1)
            for y in range(0, top_search_limit):
                if grad[y] > grad_low:
                    top_p2.append(y + 1)
                    break

        if verbose:
            print(f"       Phase-2 top (grad>{grad_low}, inner cols): {sorted(set(top_p2))[:8]}…")

        if top_p2:
            top_filt = [e for e in top_p2 if e > bdy] or top_p2
            med_top = int(np.median(top_filt))
        elif top_use:
            top_filt = [e for e in top_use if e > bdy] or top_use
            med_top = min(top_filt)
        else:
            med_top = None

        search_bottom = int(h * 0.95)
        search_top_p2 = max((med_top or 0) + 30, h // 4)
        bot_p2: list[int] = []
        for cx in inner:
            col = arr[:, cx].astype(np.int32)
            grad = np.max(np.abs(np.diff(col, axis=0)), axis=1)
            for y in range(min(search_bottom, h - 2), search_top_p2, -1):
                if grad[y] > grad_low:
                    bot_p2.append(y)
                    break

        if verbose:
            print(f"       Phase-2 bot (grad>{grad_low}, inner cols): {sorted(set(bot_p2))[:8]}…")

        med_bot = None
        for bot_candidates in (bot_p2, bot_prel):
            if bot_candidates:
                bot_filt = [e for e in bot_candidates if e < h - bdy] or bot_candidates
                med_bot = int(np.median(bot_filt))
                break

        if med_top is not None and med_bot is not None:
            result = (med_top, med_left, med_bot, med_right)
            if _bbox_is_sane(*result, h, w):
                if verbose:
                    top_src = "Phase-2" if top_p2 else "Phase-1 min"
                    bot_src = "Phase-2" if bot_p2 else "Phase-1 prelim"
                    print(f"       Detection method: gradient (top:{top_src}, bot:{bot_src})")
                return result

    if verbose:
        print("       Primary scan inconclusive — trying variance fallback")
    result = _find_bbox_variance(
        arr, std_threshold=max(10.0, 55.0 - tol), verbose=verbose
    )
    if result and _bbox_is_sane(*result, h, w):
        if verbose:
            print("       Detection method: variance")
        return result

    return None


PASS = "\033[32m✓\033[0m"
FAIL = "\033[31m✗\033[0m"
WARN = "\033[33m⚠\033[0m"


def _check(
    ok: bool, msg_pass: str, msg_fail: str, issues: list[str], warn: bool = False
) -> None:
    if ok:
        print(f"  {PASS} {msg_pass}")
    else:
        symbol = WARN if warn else FAIL
        issues.append(msg_fail)
        print(f"  {symbol} {msg_fail}")


def validate(
    path_or_url: str, tol: int = DEFAULT_TOLERANCE, verbose: bool = False
) -> list[str]:
    issues: list[str] = []

    try:
        img = load_image(path_or_url)
    except Exception as e:
        issues.append(f"Could not load: {e}")
        print(f"  {FAIL} Could not load: {e}")
        return issues

    w, h = img.size
    arr = np.array(img)

    size_ok = w == EXPECTED_WIDTH and h == EXPECTED_HEIGHT
    _check(
        size_ok,
        f"Size: {w}×{h}",
        f"Wrong size: {w}×{h}  (expected {EXPECTED_WIDTH}×{EXPECTED_HEIGHT})",
        issues,
    )

    bbox = find_window_bbox(arr, tol=tol, verbose=verbose)
    if bbox is None:
        issues.append("Could not detect window/content boundaries")
        print(
            f"  {FAIL} Could not detect window — image may be solid colour or "
            f"low contrast. Try --tolerance {tol + 10}"
        )
        return issues

    top, left, bottom, right = bbox
    pad_top = top / h
    pad_bottom = (h - bottom - 1) / h
    pad_left = left / w
    pad_right = (w - right - 1) / w

    if verbose:
        print(f"       Window bbox: top={top} left={left} bottom={bottom} right={right}")
        print(
            "       Padding raw: "
            f"top={pad_top:.1%} bottom={pad_bottom:.1%} "
            f"left={pad_left:.1%} right={pad_right:.1%}"
        )

    lo = EXPECTED_PAD - PAD_TOLERANCE
    hi = EXPECTED_PAD + PAD_TOLERANCE
    for side, pad in [
        ("top", pad_top),
        ("bottom", pad_bottom),
        ("left", pad_left),
        ("right", pad_right),
    ]:
        ok = lo <= pad <= hi
        _check(
            ok,
            f"Padding {side}: {pad:.1%}  (expected ~{EXPECTED_PAD:.0%})",
            f"Padding {side} out of range: {pad:.1%}  "
            f"(expected {lo:.0%}–{hi:.0%}, target ~{EXPECTED_PAD:.0%})",
            issues,
        )

    lr_diff = abs(pad_left - pad_right)
    _check(
        lr_diff <= MAX_ASYMMETRY,
        f"Left/right symmetric: {pad_left:.1%} / {pad_right:.1%}  (diff {lr_diff:.1%})",
        f"Left/right asymmetric: {pad_left:.1%} vs {pad_right:.1%}  "
        f"(diff {lr_diff:.1%}, max {MAX_ASYMMETRY:.0%})",
        issues,
    )

    tb_diff = abs(pad_top - pad_bottom)
    _check(
        tb_diff <= MAX_ASYMMETRY,
        f"Top/bottom symmetric: {pad_top:.1%} / {pad_bottom:.1%}  (diff {tb_diff:.1%})",
        f"Top/bottom asymmetric: {pad_top:.1%} vs {pad_bottom:.1%}  "
        f"(diff {tb_diff:.1%}, max {MAX_ASYMMETRY:.0%})",
        issues,
    )

    return issues


def find_images(directory: str, recursive: bool) -> list[str]:
    root = Path(directory)
    pattern = "**/*" if recursive else "*"
    return sorted(
        str(p)
        for p in root.glob(pattern)
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTS
    )


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Validate Raycast screenshot images for size and padding symmetry.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("images", nargs="*", help="Image paths or URLs")
    parser.add_argument("--dir", "-d", metavar="DIR", help="Scan a directory for images")
    parser.add_argument("--recursive", "-r", action="store_true", help="Scan --dir recursively")
    parser.add_argument(
        "--tolerance",
        "-t",
        type=int,
        default=DEFAULT_TOLERANCE,
        help=(
            f"Colour difference tolerance per channel (default: {DEFAULT_TOLERANCE}). "
            "Increase for JPEG/noisy images."
        ),
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Print bounding-box coordinates and edge colours"
    )
    parser.add_argument("--fail-fast", action="store_true", help="Stop after the first failing image")
    args = parser.parse_args()

    targets: list[str] = list(args.images)
    if args.dir:
        found = find_images(args.dir, args.recursive)
        if not found:
            print(f"No images found in {args.dir}", file=sys.stderr)
            sys.exit(1)
        targets.extend(found)

    if not targets:
        parser.print_help()
        sys.exit(0)

    total_pass = 0
    total_fail = 0

    for target in targets:
        label = os.path.basename(target) if not target.startswith("http") else target
        print(f"\n{'─' * 60}")
        print(f"  {label}")
        print(f"{'─' * 60}")

        issues = validate(target, tol=args.tolerance, verbose=args.verbose)

        if issues:
            total_fail += 1
            print(
                f"\n  Result: {FAIL}\033[31m FAIL\033[0m  "
                f"({len(issues)} issue{'s' if len(issues) > 1 else ''})"
            )
            if args.fail_fast:
                break
        else:
            total_pass += 1
            print(f"\n  Result: {PASS}\033[32m PASS\033[0m")

    print(f"\n{'═' * 60}")
    print(f"  Summary: {total_pass} passed, {total_fail} failed  ({len(targets)} total)")
    print(f"{'═' * 60}\n")

    sys.exit(1 if total_fail > 0 else 0)


if __name__ == "__main__":
    main()
