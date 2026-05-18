// Input source helper for the Raycast Auto Language Switcher extension.
// Commands:
//   input-source list           — print keyboard input source IDs (one per line)
//   input-source current        — print the active input source ID
//   input-source switch <id>    — activate the input source with the given ID
//   input-source frontmost      — print frontmost app name (no Automation permission needed)

import Cocoa
import Carbon

func stderr(_ msg: String) {
    FileHandle.standardError.write(Data((msg + "\n").utf8))
}

func allSources() -> [TISInputSource] {
    guard let raw = TISCreateInputSourceList(nil, false) else { return [] }
    return (raw.takeRetainedValue() as? [TISInputSource]) ?? []
}

func sourceId(_ source: TISInputSource) -> String? {
    guard let ptr = TISGetInputSourceProperty(source, kTISPropertyInputSourceID) else { return nil }
    return Unmanaged<CFString>.fromOpaque(ptr).takeUnretainedValue() as String
}

func listSources() {
    let keyboardCategory = kTISCategoryKeyboardInputSource as String
    for source in allSources() {
        guard let id = sourceId(source),
              let catPtr = TISGetInputSourceProperty(source, kTISPropertyInputSourceCategory) else { continue }
        let category = Unmanaged<CFString>.fromOpaque(catPtr).takeUnretainedValue() as String
        if category == keyboardCategory {
            print(id)
        }
    }
}

func currentSourceId() -> String? {
    let source = TISCopyCurrentKeyboardInputSource().takeRetainedValue()
    return sourceId(source)
}

func switchSource(to targetId: String) -> Bool {
    for source in allSources() {
        if sourceId(source) == targetId {
            guard TISSelectInputSource(source) == noErr else { return false }
            // Spin the run loop briefly so the TIS change propagates system-wide.
            // Without this, the selection is set but never flushed from the CLI context.
            CFRunLoopRunInMode(CFRunLoopMode.defaultMode, 0.1, false)
            return true
        }
    }
    return false
}

let args = CommandLine.arguments

switch args.count > 1 ? args[1] : "" {
case "list":
    listSources()

case "current":
    print(currentSourceId() ?? "unknown")

case "switch":
    guard args.count > 2 else {
        stderr("Usage: input-source switch <id>")
        exit(1)
    }
    if !switchSource(to: args[2]) {
        stderr("input source not found or switch failed: \(args[2])")
        exit(1)
    }

case "frontmost":
    // NSWorkspace doesn't require Automation/Accessibility permissions.
    let name: String? = MainActor.assumeIsolated {
        NSWorkspace.shared.frontmostApplication?.localizedName
    }
    guard let name else { stderr("frontmost app unavailable"); exit(1) }
    print(name)

default:
    stderr("Usage: input-source <list | current | switch <id> | frontmost>")
    exit(1)
}
