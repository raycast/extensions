import AppKit
import CoreGraphics
import Foundation

guard CommandLine.arguments.count == 3,
      let pid = pid_t(CommandLine.arguments[2]) else {
  fputs("Usage: firefox-window-helper <count|activate> <pid>\n", stderr)
  exit(2)
}

func windowCount(for pid: pid_t) -> Int {
  guard let windows = CGWindowListCopyWindowInfo([.optionAll], kCGNullWindowID) as? [[String: Any]] else {
    return 0
  }

  return windows.filter { window in
    let ownerPid = window[kCGWindowOwnerPID as String] as? pid_t
    let layer = window[kCGWindowLayer as String] as? Int
    let alpha = window[kCGWindowAlpha as String] as? Double
    let bounds = window[kCGWindowBounds as String] as? [String: CGFloat]
    let width = bounds?["Width"] ?? 0
    let height = bounds?["Height"] ?? 0
    return ownerPid == pid && layer == 0 && (alpha ?? 1) > 0 && width > 100 && height > 100
  }.count
}

switch CommandLine.arguments[1] {
case "count":
  print(windowCount(for: pid))
case "activate":
  guard let app = NSRunningApplication(processIdentifier: pid) else {
    fputs("Process \(pid) is not running\n", stderr)
    exit(3)
  }
  let activated = app.activate(options: [.activateAllWindows])
  Thread.sleep(forTimeInterval: 0.15)
  print(activated && app.isActive ? "active" : "inactive")
  if !activated { exit(4) }
default:
  fputs("Unknown command\n", stderr)
  exit(2)
}
