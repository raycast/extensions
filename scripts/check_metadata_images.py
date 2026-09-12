#!/usr/bin/env python3
"""Validate Raycast Store screenshots for one or more extensions.

In pull-request CI, extensions with metadata changes are validated as a complete
set. Screenshots are optional. Locally, pass an extension directory (or any
path inside it) to validate the same scope without GitHub environment variables:

    python3 scripts/check_metadata_images.py extensions/example

With no arguments outside PR CI, every extension that has metadata is checked.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from collections import deque
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Sequence


SUPPORTED_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
STORE_EXT = ".png"
MAX_SCREENSHOTS = 6
BACKGROUND_RMS_LIMIT = 12.0
EXPECTED_SIZE = (2000, 1250)


@dataclass(frozen=True)
class ChangedFile:
    filename: str
    status: str
    previous_filename: str | None = None


@dataclass(frozen=True)
class ImageProfile:
    background: object
    appearance: str
    has_local_extension_icon: bool


def extension_relative_path(path: str | Path) -> PurePosixPath | None:
    parts = PurePosixPath(str(path).replace("\\", "/")).parts
    try:
        index = len(parts) - 1 - tuple(reversed(parts)).index("extensions")
    except ValueError:
        return None
    if len(parts) <= index + 1:
        return None
    return PurePosixPath("extensions", parts[index + 1])


def metadata_relative_path(path: str | Path) -> PurePosixPath | None:
    extension = extension_relative_path(path)
    if extension is None:
        return None
    parts = PurePosixPath(str(path).replace("\\", "/")).parts
    index = len(parts) - 1 - tuple(reversed(parts)).index("extensions")
    if len(parts) <= index + 3 or parts[index + 2] != "metadata":
        return None
    return PurePosixPath(*parts[index:])


def is_metadata_image(path: str | Path) -> bool:
    metadata_path = metadata_relative_path(path)
    return metadata_path is not None and metadata_path.suffix.lower() in SUPPORTED_EXTS


def find_metadata_images(extension_dir: Path) -> list[Path]:
    metadata_dir = extension_dir / "metadata"
    return sorted(
        path
        for path in metadata_dir.rglob("*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTS
    )


def find_extension_dirs(repo_root: Path) -> list[Path]:
    return sorted(
        package_json.parent
        for package_json in (repo_root / "extensions").glob("*/package.json")
        if (package_json.parent / "metadata").is_dir()
    )


def changed_files_from_env() -> list[ChangedFile] | None:
    raw = os.environ.get("METADATA_CHECK_CHANGED_FILES", "").strip()
    if not raw:
        # Backward compatibility with the first version of the workflow.
        image_paths = os.environ.get("METADATA_IMAGE_PATHS", "").strip()
        if not image_paths:
            return None
        return [ChangedFile(path.strip(), "modified") for path in image_paths.splitlines()]

    changed_files: list[ChangedFile] = []
    for line in raw.splitlines():
        fields = line.split("\t")
        if len(fields) not in {2, 3}:
            raise ValueError(
                "METADATA_CHECK_CHANGED_FILES entries must be "
                "<status>\\t<filename>[\\t<previous_filename>]"
            )
        status, filename, *previous = fields
        changed_files.append(ChangedFile(filename, status, previous[0] if previous else None))
    return changed_files


def get_pr_changed_files() -> list[ChangedFile] | None:
    event_path = os.environ.get("GITHUB_EVENT_PATH")
    event_name = os.environ.get("GITHUB_EVENT_NAME")
    repository = os.environ.get("GITHUB_REPOSITORY")
    token = os.environ.get("GITHUB_TOKEN")

    if event_name != "pull_request" or not event_path:
        return None

    try:
        payload = json.loads(Path(event_path).read_text())
        pr_number = payload["pull_request"]["number"]
    except Exception as exc:
        raise RuntimeError(f"Could not read PR event payload: {exc}") from exc

    if not repository or not token:
        raise RuntimeError("Missing GITHUB_REPOSITORY or GITHUB_TOKEN.")

    changed_files: list[ChangedFile] = []
    page = 1
    while True:
        url = (
            f"https://api.github.com/repos/{repository}/pulls/{pr_number}/files"
            f"?per_page=100&page={page}"
        )
        request = urllib.request.Request(
            url,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "User-Agent": "metadata-image-enforcer",
            },
        )
        try:
            with urllib.request.urlopen(request) as response:
                data = json.loads(response.read().decode("utf-8"))
        except urllib.error.URLError as exc:
            raise RuntimeError(f"Could not fetch PR files: {exc}") from exc

        if not data:
            break

        changed_files.extend(
            ChangedFile(
                item["filename"],
                item.get("status", "modified"),
                item.get("previous_filename"),
            )
            for item in data
        )
        page += 1

    return changed_files


def affected_extension_dirs(repo_root: Path, changed_files: Sequence[ChangedFile]) -> list[Path]:
    relative_dirs: set[PurePosixPath] = set()

    for changed_file in changed_files:
        paths = [changed_file.filename]
        if changed_file.previous_filename:
            paths.append(changed_file.previous_filename)

        for filename in paths:
            extension = extension_relative_path(filename)
            if extension is None:
                continue
            if metadata_relative_path(filename) is not None:
                relative_dirs.add(extension)

    return sorted(
        path
        for relative in relative_dirs
        if (path := repo_root / relative).is_dir()
    )


def extension_dirs_from_args(repo_root: Path, paths: Sequence[str]) -> list[Path]:
    extension_dirs: set[Path] = set()
    for raw_path in paths:
        path = Path(raw_path)
        if not path.is_absolute():
            path = repo_root / path
        relative = extension_relative_path(path)
        if relative is None:
            raise ValueError(f"Path is not inside an extension: {raw_path}")
        extension_dir = repo_root / relative
        if not extension_dir.is_dir():
            raise ValueError(f"Extension directory does not exist: {extension_dir}")
        extension_dirs.add(extension_dir)
    return sorted(extension_dirs)


def validate_extension_structure(extension_dir: Path) -> tuple[list[Path], list[str]]:
    metadata_dir = extension_dir / "metadata"
    if not metadata_dir.is_dir():
        return [], []

    images = find_metadata_images(extension_dir)
    issues: list[str] = []
    if not images:
        return images, issues

    if len(images) > MAX_SCREENSHOTS:
        issues.append(
            f"{extension_dir.name}: metadata/ has {len(images)} screenshots "
            f"(maximum {MAX_SCREENSHOTS})"
        )

    wrong_format = [image for image in images if image.suffix.lower() != STORE_EXT]
    for image in wrong_format:
        issues.append(f"{image}: Store screenshots must use PNG format")

    return images, issues


def _background_fingerprint(image: object) -> object:
    import numpy as np
    from PIL import Image

    resampling = getattr(Image, "Resampling", Image).BILINEAR
    resized = np.asarray(image.resize((100, 62), resampling), dtype=np.float32)
    mask = np.ones((62, 100), dtype=bool)
    mask[5:-5, 7:-7] = False
    return resized[mask]


def background_rms(first: object, second: object) -> float:
    import numpy as np

    return float(np.sqrt(np.mean((first - second) ** 2)))


def _has_local_extension_icon(array: object, bbox: tuple[int, int, int, int]) -> bool:
    import numpy as np

    top, left, bottom, right = bbox
    window_height = bottom - top
    window_width = right - left
    y0 = max(top, bottom - int(window_height * 0.12))
    y1 = max(y0 + 1, bottom - int(window_height * 0.01))
    x0 = left + int(window_width * 0.08)
    x1 = left + int(window_width * 0.58)
    footer = array[y0:y1, x0:x1].astype(np.int16)
    if footer.size == 0:
        return False

    red, green, blue = footer[:, :, 0], footer[:, :, 1], footer[:, :, 2]
    green_pixels = (green > 120) & (green > red + 35) & (green > blue + 15)
    seen = np.zeros(green_pixels.shape, dtype=bool)
    min_side = max(3, int(min(array.shape[:2]) * 0.012))
    max_side = max(min_side, int(min(array.shape[:2]) * 0.04))

    for start_y, start_x in zip(*np.where(green_pixels)):
        if seen[start_y, start_x]:
            continue
        queue = deque([(int(start_y), int(start_x))])
        seen[start_y, start_x] = True
        count = 0
        min_x = max_x = int(start_x)
        min_y = max_y = int(start_y)

        while queue:
            y, x = queue.popleft()
            count += 1
            min_x, max_x = min(min_x, x), max(max_x, x)
            min_y, max_y = min(min_y, y), max(max_y, y)
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    next_y, next_x = y + dy, x + dx
                    if (
                        0 <= next_y < green_pixels.shape[0]
                        and 0 <= next_x < green_pixels.shape[1]
                        and green_pixels[next_y, next_x]
                        and not seen[next_y, next_x]
                    ):
                        seen[next_y, next_x] = True
                        queue.append((next_y, next_x))

        width = max_x - min_x + 1
        height = max_y - min_y + 1
        if (
            count >= max(8, int(min_side * min_side * 0.25))
            and min_side <= width <= max_side
            and min_side <= height <= max_side
            and 0.7 <= width / height <= 1.3
        ):
            return True

    return False


def profile_image(image_path: Path) -> ImageProfile:
    import numpy as np
    from PIL import Image

    from check_raycast_images import find_window_bbox

    with Image.open(image_path) as source:
        image = source.convert("RGB")
    array = np.asarray(image)
    bbox = find_window_bbox(array)
    if bbox is None:
        raise ValueError("could not detect the Raycast window")

    top, left, bottom, right = bbox
    interior = array[top:bottom, left:right].astype(np.float32)
    luminance = (
        0.2126 * interior[:, :, 0]
        + 0.7152 * interior[:, :, 1]
        + 0.0722 * interior[:, :, 2]
    )
    appearance = "light" if float(np.median(luminance)) >= 130 else "dark"
    return ImageProfile(
        background=_background_fingerprint(image),
        appearance=appearance,
        has_local_extension_icon=_has_local_extension_icon(array, bbox),
    )


def extension_platforms(extension_dir: Path) -> tuple[str, ...]:
    try:
        manifest = json.loads((extension_dir / "package.json").read_text())
    except (OSError, json.JSONDecodeError):
        return ()

    platforms = manifest.get("platforms")
    if not isinstance(platforms, list):
        return ()
    return tuple(platform for platform in platforms if isinstance(platform, str))


def validate_image_dimensions(images: Sequence[Path]) -> list[str]:
    from PIL import Image

    issues: list[str] = []
    for image in images:
        try:
            with Image.open(image) as source:
                size = source.size
        except Exception as exc:
            issues.append(f"{image}: could not read screenshot dimensions: {exc}")
            continue
        if size != EXPECTED_SIZE:
            issues.append(
                f"{image}: wrong size {size[0]}×{size[1]} "
                f"(expected {EXPECTED_SIZE[0]}×{EXPECTED_SIZE[1]})"
            )
    return issues


def validate_image_set(extension_dir: Path, images: Sequence[Path]) -> list[str]:
    issues: list[str] = []
    profiles: list[tuple[Path, ImageProfile]] = []
    for image in images:
        try:
            profile = profile_image(image)
        except Exception as exc:
            issues.append(f"{image}: could not inspect screenshot style: {exc}")
            continue
        profiles.append((image, profile))
        if profile.has_local_extension_icon:
            issues.append(
                f"{image}: local extension icon is visible in the bottom bar; "
                "recapture it with Raycast Window Capture and Save to Metadata"
            )

    # macOS and Windows captures have different chrome and may intentionally use
    # different backgrounds. Metadata does not identify an individual image's
    # platform, so set-level visual comparisons are only safe for extensions
    # that declare exactly one platform.
    if len(profiles) < 2 or len(set(extension_platforms(extension_dir))) != 1:
        return issues

    reference_path, reference = profiles[0]
    for image, profile in profiles[1:]:
        distance = background_rms(reference.background, profile.background)
        if distance > BACKGROUND_RMS_LIMIT:
            issues.append(
                f"{image}: background does not match {reference_path.name} "
                f"(difference {distance:.1f}, maximum {BACKGROUND_RMS_LIMIT:.1f})"
            )
        if profile.appearance != reference.appearance:
            issues.append(
                f"{image}: {profile.appearance} appearance does not match "
                f"{reference_path.name} ({reference.appearance})"
            )

    return issues


def print_issues(issues: Sequence[str]) -> None:
    for issue in issues:
        print(f"  \033[31m✗\033[0m {issue}", file=sys.stderr)


def run(repo_root: Path, extension_dirs: Sequence[Path]) -> int:
    validator = repo_root / "scripts" / "check_raycast_images.py"
    if not validator.exists():
        print(f"Missing validator script: {validator}", file=sys.stderr)
        return 1

    if not extension_dirs:
        print("No metadata changes found for this pull request.")
        return 0

    images: list[Path] = []
    issues: list[str] = []
    for extension_dir in extension_dirs:
        extension_images, structure_issues = validate_extension_structure(extension_dir)
        images.extend(extension_images)
        issues.extend(structure_issues)
        issues.extend(validate_image_dimensions(extension_images))
        issues.extend(validate_image_set(extension_dir, extension_images))

    print(
        f"Validating {len(images)} metadata image(s) across "
        f"{len(extension_dirs)} extension(s).",
        flush=True,
    )
    if issues:
        print_issues(issues)

    validator_result = 0
    if images:
        completed = subprocess.run(
            [
                sys.executable,
                str(validator),
                *(str(image) for image in images),
            ],
            cwd=repo_root,
            check=False,
        )
        validator_result = completed.returncode

    return 1 if issues or validator_result else 0


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "paths",
        nargs="*",
        help="Extension directories or paths inside extensions to validate",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    repo_root = Path(__file__).resolve().parent.parent

    try:
        if args.paths:
            extension_dirs = extension_dirs_from_args(repo_root, args.paths)
        else:
            changed_files = changed_files_from_env()
            if changed_files is None:
                changed_files = get_pr_changed_files()
            extension_dirs = (
                affected_extension_dirs(repo_root, changed_files)
                if changed_files is not None
                else find_extension_dirs(repo_root)
            )
    except (RuntimeError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 1

    return run(repo_root, extension_dirs)


if __name__ == "__main__":
    raise SystemExit(main())
