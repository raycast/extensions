from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import numpy as np
from PIL import Image


SCRIPTS_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS_DIR))

import check_metadata_images as checker  # noqa: E402


class PathSelectionTests(unittest.TestCase):
    def test_metadata_image_requires_the_expected_directory_shape(self) -> None:
        self.assertTrue(checker.is_metadata_image("extensions/example/metadata/one.PNG"))
        self.assertFalse(checker.is_metadata_image("extensions/metadata/assets/one.png"))
        self.assertFalse(checker.is_metadata_image("extensions/example/assets/metadata.png"))
        self.assertFalse(checker.is_metadata_image("metadata/one.png"))

    def test_absolute_path_uses_the_repository_extensions_directory(self) -> None:
        path = "/tmp/work/extensions/extensions/example/metadata/one.png"
        self.assertEqual(
            checker.extension_relative_path(path),
            Path("extensions/example"),
        )

    def test_affected_extensions_include_metadata_changes_only(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            for name in ("new-extension", "screenshots", "source-only", "renamed"):
                (repo_root / "extensions" / name).mkdir(parents=True)

            changed_files = [
                checker.ChangedFile("extensions/new-extension/package.json", "added"),
                checker.ChangedFile("extensions/screenshots/metadata/one.png", "modified"),
                checker.ChangedFile("extensions/source-only/src/index.tsx", "modified"),
                checker.ChangedFile(
                    "extensions/renamed/metadata/new.png",
                    "renamed",
                    "extensions/screenshots/metadata/old.png",
                ),
                checker.ChangedFile("extensions/deleted/package.json", "removed"),
            ]

            actual = checker.affected_extension_dirs(repo_root, changed_files)

            self.assertEqual(
                [path.name for path in actual],
                ["renamed", "screenshots"],
            )

    def test_changed_files_environment_supports_renames(self) -> None:
        value = (
            "added\textensions/new/package.json\n"
            "renamed\textensions/new/metadata/new.png\t"
            "extensions/old/metadata/old.png"
        )
        with mock.patch.dict(os.environ, {"METADATA_CHECK_CHANGED_FILES": value}, clear=True):
            self.assertEqual(
                checker.changed_files_from_env(),
                [
                    checker.ChangedFile("extensions/new/package.json", "added"),
                    checker.ChangedFile(
                        "extensions/new/metadata/new.png",
                        "renamed",
                        "extensions/old/metadata/old.png",
                    ),
                ],
            )


class StructureTests(unittest.TestCase):
    def test_missing_metadata_directory_is_allowed(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            extension_dir = Path(temp_dir) / "example"
            extension_dir.mkdir()

            images, issues = checker.validate_extension_structure(extension_dir)

            self.assertEqual(images, [])
            self.assertEqual(issues, [])

    def test_requires_png_and_no_more_than_six_screenshots(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            extension_dir = Path(temp_dir) / "example"
            metadata_dir = extension_dir / "metadata"
            metadata_dir.mkdir(parents=True)
            for index in range(6):
                (metadata_dir / f"{index}.png").write_bytes(b"fixture")
            (metadata_dir / "extra.jpg").write_bytes(b"fixture")

            images, issues = checker.validate_extension_structure(extension_dir)

            self.assertEqual(len(images), 7)
            self.assertTrue(any("maximum 6" in issue for issue in issues))
            self.assertTrue(any("must use PNG format" in issue for issue in issues))

    def test_screenshot_dimensions_are_platform_independent(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            valid = Path(temp_dir) / "valid.png"
            invalid = Path(temp_dir) / "invalid.png"
            Image.new("RGB", checker.EXPECTED_SIZE).save(valid)
            Image.new("RGB", (1250, 2000)).save(invalid)

            self.assertEqual(checker.validate_image_dimensions([valid]), [])
            self.assertIn("wrong size 1250×2000", checker.validate_image_dimensions([invalid])[0])


class ImageStyleTests(unittest.TestCase):
    @staticmethod
    def write_manifest(extension_dir: Path, platforms: list[str]) -> None:
        extension_dir.mkdir(parents=True, exist_ok=True)
        (extension_dir / "package.json").write_text(json.dumps({"platforms": platforms}))

    def test_background_fingerprint_distinguishes_wallpapers(self) -> None:
        first = checker._background_fingerprint(Image.new("RGB", (400, 250), "#202020"))
        same = checker._background_fingerprint(Image.new("RGB", (400, 250), "#202020"))
        different = checker._background_fingerprint(Image.new("RGB", (400, 250), "#d06080"))

        self.assertEqual(checker.background_rms(first, same), 0)
        self.assertGreater(checker.background_rms(first, different), checker.BACKGROUND_RMS_LIMIT)

    def test_detects_green_local_extension_badge_in_bottom_bar(self) -> None:
        array = np.full((250, 400, 3), 35, dtype=np.uint8)
        bbox = (30, 50, 220, 350)
        array[200:210, 130:140] = (0, 210, 120)

        self.assertTrue(checker._has_local_extension_icon(array, bbox))

        array[200:210, 130:140] = (140, 140, 140)
        self.assertFalse(checker._has_local_extension_icon(array, bbox))

    def test_single_platform_images_are_compared_on_macos_and_windows(self) -> None:
        for platform in ("macOS", "Windows"):
            with self.subTest(platform=platform), tempfile.TemporaryDirectory() as temp_dir:
                extension_dir = Path(temp_dir) / "example"
                self.write_manifest(extension_dir, [platform])
                first = Path("metadata/one.png")
                second = Path("metadata/two.png")
                profiles = {
                    first: checker.ImageProfile(np.zeros((2, 3)), "dark", False),
                    second: checker.ImageProfile(np.full((2, 3), 100), "light", True),
                }

                with mock.patch.object(checker, "profile_image", side_effect=profiles.__getitem__):
                    issues = checker.validate_image_set(extension_dir, [first, second])

                self.assertTrue(any("local extension icon" in issue for issue in issues))
                self.assertTrue(any("background does not match" in issue for issue in issues))
                self.assertTrue(any("light appearance does not match" in issue for issue in issues))

    def test_cross_platform_images_are_not_compared_with_each_other(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            extension_dir = Path(temp_dir) / "example"
            self.write_manifest(extension_dir, ["macOS", "Windows"])
            first = Path("metadata/mac.png")
            second = Path("metadata/windows.png")
            profiles = {
                first: checker.ImageProfile(np.zeros((2, 3)), "dark", False),
                second: checker.ImageProfile(np.full((2, 3), 100), "light", False),
            }

            with mock.patch.object(checker, "profile_image", side_effect=profiles.__getitem__):
                issues = checker.validate_image_set(extension_dir, [first, second])

        self.assertEqual(issues, [])

    def test_macos_framing_is_not_applied_to_windows_or_cross_platform_images(self) -> None:
        cases = [
            (["macOS"], True),
            (["Windows"], False),
            (["macOS", "Windows"], False),
            ([], True),
        ]
        for platforms, expected in cases:
            with self.subTest(platforms=platforms), tempfile.TemporaryDirectory() as temp_dir:
                extension_dir = Path(temp_dir) / "example"
                self.write_manifest(extension_dir, platforms)
                self.assertEqual(checker.requires_macos_framing(extension_dir), expected)


if __name__ == "__main__":
    unittest.main()
