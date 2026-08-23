#!/usr/bin/env python3
"""
Validate metadata images with the Raycast image checker.

On GitHub pull requests, only changed metadata images are validated.
If a PR does not touch any metadata images, the script exits successfully.
Outside PR CI, it falls back to validating all metadata images in the repo.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path


SUPPORTED_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}


def find_metadata_images(repo_root: Path) -> list[Path]:
    return sorted(
        path
        for path in repo_root.glob("extensions/**/metadata/**/*")
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTS
    )


def is_metadata_image(path: Path) -> bool:
    return (
        path.suffix.lower() in SUPPORTED_EXTS
        and "extensions" in path.parts
        and "metadata" in path.parts
    )


def get_metadata_images_from_env(repo_root: Path) -> list[Path] | None:
    raw = os.environ.get("METADATA_IMAGE_PATHS", "").strip()
    if not raw:
        return None

    images: list[Path] = []
    for rel_path in raw.splitlines():
        path = repo_root / rel_path.strip()
        if path.is_file() and is_metadata_image(path):
            images.append(path)
    return sorted(images)


def get_pr_changed_metadata_images(repo_root: Path) -> list[Path] | None:
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
        print(f"Could not read PR event payload: {exc}", file=sys.stderr)
        raise SystemExit(1)

    if not repository or not token:
        print("Missing GITHUB_REPOSITORY or GITHUB_TOKEN.", file=sys.stderr)
        raise SystemExit(1)

    changed_paths: list[str] = []
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
            print(f"Could not fetch PR files: {exc}", file=sys.stderr)
            raise SystemExit(1)

        if not data:
            break

        changed_paths.extend(
            item["filename"]
            for item in data
            if item.get("status") in {"added", "modified", "renamed"}
        )
        page += 1

    changed_images: list[Path] = []
    for rel_path in changed_paths:
        path = repo_root / rel_path
        if path.is_file() and is_metadata_image(path):
            changed_images.append(path)

    return sorted(changed_images)


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    validator = repo_root / "scripts" / "check_raycast_images.py"

    if not validator.exists():
        print(f"Missing validator script: {validator}", file=sys.stderr)
        return 1

    images = get_metadata_images_from_env(repo_root)
    if images is None:
        images = get_pr_changed_metadata_images(repo_root)
    if images is None:
        images = find_metadata_images(repo_root)
        scope_label = "repository"
    else:
        scope_label = "pull request"

    if not images:
        print(f"No metadata images found for this {scope_label}.")
        return 0

    print(f"Validating {len(images)} metadata image(s) from the {scope_label}.")
    cmd = ["python3", str(validator), *(str(image) for image in images)]
    completed = subprocess.run(cmd, cwd=repo_root)
    return completed.returncode


if __name__ == "__main__":
    raise SystemExit(main())
  
