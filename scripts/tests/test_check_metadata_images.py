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
import check_raycast_images as framing_checker  # noqa: E402


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

    def test_rename_out_of_metadata_still_affects_original_extension(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            extension_dir = repo_root / "extensions" / "example"
            extension_dir.mkdir(parents=True)

            actual = checker.affected_extension_dirs(
                repo_root,
                [
                    checker.ChangedFile(
                        "extensions/example/assets/screenshot.png",
                        "renamed",
                        "extensions/example/metadata/screenshot.png",
                    )
                ],
            )

            self.assertEqual(actual, [extension_dir])


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

    def test_windows_capture_detector_prefers_outer_window_over_inner_panel(self) -> None:
        array = np.full((1250, 2000, 3), 8, dtype=np.uint8)
        array[150:1100, 250:1750] = 30
        array[440:1000, 1030:1735] = 75

        self.assertEqual(
            framing_checker.find_window_bbox(array),
            (150, 250, 1099, 1749),
        )

    def test_off_center_windows_capture_is_not_accepted_as_store_framing(self) -> None:
        array = np.full((1250, 2000, 3), 8, dtype=np.uint8)
        array[150:1100, 100:1600] = 100

        bbox = framing_checker.find_window_bbox(array)

        self.assertIsNotNone(bbox)
        self.assertFalse(framing_checker._padding_is_expected(*bbox, 1250, 2000))

    def test_run_sends_windows_screenshots_to_framing_validator(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir)
            validator = repo_root / "scripts" / "check_raycast_images.py"
            validator.parent.mkdir()
            validator.touch()

            extension_dir = repo_root / "extensions" / "media-switcher"
            self.write_manifest(extension_dir, ["Windows"])
            screenshots = [extension_dir / "metadata" / f"{index}.png" for index in range(3)]

            with (
                mock.patch.object(
                    checker,
                    "validate_extension_structure",
                    return_value=(screenshots, []),
                ),
                mock.patch.object(checker, "validate_image_dimensions", return_value=[]),
                mock.patch.object(checker, "validate_image_set", return_value=[]),
                mock.patch.object(checker.subprocess, "run") as run_validator,
            ):
                run_validator.return_value.returncode = 0
                result = checker.run(repo_root, [extension_dir])

            self.assertEqual(result, 0)
            run_validator.assert_called_once_with(
                [
                    sys.executable,
                    str(validator),
                    *(str(screenshot) for screenshot in screenshots),
                ],
                cwd=repo_root,
                check=False,
            )


if __name__ == "__main__":
    unittest.main()
