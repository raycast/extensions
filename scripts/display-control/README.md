# Display Control Development

The extension source lives in `extensions/display-control`. This directory keeps its automated tests, editable icon source, and append-only development log outside the Store package.

## Developers can validate the extension.

Run `npm ci` from `extensions/display-control` first. Run `npm run lint` and `npm run build` there to validate changes. Run `npm run dev` there when you want to test the command in Raycast.

Raycast builds the native source in `swift/DisplayHelper` through its official Swift bridge. Developers need Xcode with a compatible Swift toolchain. End users do not need a Swift toolchain or another app.

The automated tests simulate DDC responses and native helper requests. Native layout, shortcut handling, and actual DDC/CI behavior require manual testing in Raycast with a compatible monitor.

Run `npm ci` and `npm test` from `scripts/display-control` to run the automated tests. Run `python3 scripts/check_metadata_images.py extensions/display-control` from the repository root to validate Store screenshots. The screenshot validator requires Pillow and NumPy.

The Store screenshots in `extensions/display-control/metadata` show the external display, built-in display, and shortcut actions. Native layout and hardware behavior should be checked in Raycast after relevant changes.

The metadata screenshots show the current Control Displays command.
