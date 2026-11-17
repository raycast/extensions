# Changelog

## [Initial Version] - 2026-11-17

The implementation plan adds one display list with a detail pane and keyboard controls for speaker volume, brightness, and contrast. The implementation uses m1ddc and checks each control independently. Automated validation and native monitor testing are pending.

The implementation was completed on 2026-11-17 at 19:33 CET. It includes native controls for the built-in display and Mac speakers through Raycast's Swift bridge. All 15 automated tests, lint, and the distribution build passed. Native Raycast interaction and real monitor adjustments still require manual testing.

The first-use dependency setup was added on 2026-11-17 at 19:43 CET. The command checks for m1ddc and shows a Homebrew installation guide when it is missing. Users can copy the install command, check again after installation, or continue with the built-in display. All 17 automated tests and lint passed. The installation screen still requires native Raycast testing.

The installation flow was updated on 2026-11-17 at 19:47 CET. The setup page now opens Raycast's Brew Search command with m1ddc prefilled, so users can install it with Command-I inside Raycast. It also links to Brew's Raycast Store page when the extension is needed. The copy-to-Terminal installation flow was removed. All 17 automated tests passed. The cross-extension launch still requires native Raycast testing.

The DDC recovery and volume display were updated on 2026-11-17 at 22:05 CET. The implementation spaces DDC commands, retries temporary failures, validates the reported range, and preserves the last valid controls after an error. It finishes in-flight reads before changing transports and retries writes with the same absolute target. Volume now uses a horizontal bar, and unconfirmed requested levels use an amber bar with an explanation. All 26 automated tests, lint, and the distribution build passed. A read-only check also returned valid volume, brightness, and contrast readings from the Dell display. Native Raycast layout and repeated hardware adjustments still require manual testing.

Configurable defaults and reset actions were added on 2026-11-17 at 22:38 CET. Volume initially resets to 20%, brightness to 50%, and contrast to 50%. Users can change each value in preferences, reset controls individually, or reset all available controls on the selected display. The compiled native setter rejected invalid percentages and an absent display without changing any settings. All 33 automated tests and the distribution build passed.

The detail pane was simplified on 2026-11-17 at 22:47 CET after native testing showed the cards were clipped. The implementation now uses native Markdown text and compact character bars, with no SVG cards or bottom metadata pane. Each control retains its icon, name, percentage, default value, and reset shortcut. All 33 automated tests, lint, and the distribution build passed. The updated native layout and actual reset behavior still require manual testing.

Accelerated keyboard adjustment was added on 2026-11-17 at 23:00 CET. The base step now defaults to 1%. With that base, rapid repeats increase the applied step to 2%, then 5%, and finally 10%. A pause longer than 350 milliseconds restores the base step. Changing direction, switching targets, or invoking a reset also clears acceleration. Waiting repeats for each control are combined into the latest input, and pending repeats are discarded when the command closes. All 41 automated tests, lint, and the distribution build passed. The acceleration's feel still requires manual Raycast testing.

An acceleration hint was added on 2026-11-17 at 23:07 CET. The detail pane now explains below the base step that rapid repeats accelerate up to 10% and pausing restores the configured base step. A 10% base step instead shows that it is already at the acceleration limit. All 41 automated tests, lint, TypeScript, and the distribution build passed. The hint's native Raycast layout still requires manual testing.

## Store submission preparation is in progress.

The preparation started on 2026-11-17 at 23:19 CET. The plan preserves the complete iteration log in this directory and keeps the Store changelog to one initial release entry. Contributor instructions now live beside the tests. The three Store screenshots have been reviewed visually for private information. Final tests, lint, build, screenshot validation, and the outgoing commit privacy review will run before publication.

## Store submission validation has passed.

The validation completed on 2026-11-17 at 23:20 CET. All 41 automated tests, Raycast lint, TypeScript, and the distribution build passed. The official metadata validator passed all three screenshots. The release review checked all 30 outgoing files, dependency sources, and decoded screenshot metadata without finding private information. The screenshots document native use, but this run did not repeat hardware write tests or a manual check of the final distribution build in Raycast.

## The extension is being renamed to Display Control.

The rename started on 2026-11-17 at 23:34 CET. The plan updates the extension slug to `display-control`, changes the command to Control Displays, and renames the native helper package and test directory. The existing PR branch will be retained. The metadata screenshots will remain unchanged for a manual refresh after validation. Earlier log entries retain their original wording.

## The Display Control rename has passed validation.

The validation completed on 2026-11-17 at 23:39 CET. All 41 tests, Raycast lint, TypeScript, formatting, and the distribution build passed. The built artifact contains the `control-displays` entry point and `DisplayHelper`, with no obsolete helper binary. The existing screenshots passed metadata validation and remain byte-for-byte unchanged for manual replacement. The privacy review found no private information in the renamed source, and the image hashes match the previously reviewed files. The PR title, description, and screenshot links will use the new extension path while retaining the existing PR branch.
