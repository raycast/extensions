// Event-driven daemon for Zyceh.
// Usage: daemon <support-path>
//
// Reads  <support-path>/config.json  on every app-activation event.
// Writes <support-path>/state.json   after each handled event.
// Writes <support-path>/daemon.pid   on start; removes it on clean exit.

import Cocoa
import Carbon

// MARK: - TIS helpers

func allSources() -> [TISInputSource] {
    guard let raw = TISCreateInputSourceList(nil, false) else { return [] }
    return (raw.takeRetainedValue() as? [TISInputSource]) ?? []
}

func switchSource(to targetId: String) -> Bool {
    for source in allSources() {
        guard let ptr = TISGetInputSourceProperty(source, kTISPropertyInputSourceID) else { continue }
        let id = Unmanaged<CFString>.fromOpaque(ptr).takeUnretainedValue() as String
        if id == targetId {
            guard TISSelectInputSource(source) == noErr else { return false }
            CFRunLoopRunInMode(CFRunLoopMode.defaultMode, 0.1, false)
            return true
        }
    }
    return false
}

// MARK: - Config / State

struct Config: Codable {
    var allowlist: [String] = []
    var targetLayout: String = "com.apple.keylayout.Australian"
    var enabled: Bool = true
}

struct State: Codable {
    var currentApp: String = ""
    var status: String = ""
}

func loadConfig(at path: String) -> Config {
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: path)),
          let c = try? JSONDecoder().decode(Config.self, from: data) else { return Config() }
    return c
}

func saveState(_ state: State, at path: String) {
    guard let data = try? JSONEncoder().encode(state) else { return }
    // Direct overwrite (no rename) so fs.watch on the TypeScript side gets a
    // "change" event on the same inode rather than a "rename" that breaks the watcher.
    try? data.write(to: URL(fileURLWithPath: path))
}

// MARK: - Switcher

class AppSwitcher: NSObject {
    let configPath: String
    let statePath: String

    init(supportPath: String) {
        configPath = supportPath + "/config.json"
        statePath  = supportPath + "/state.json"
        super.init()
    }

    func start() {
        NSWorkspace.shared.notificationCenter.addObserver(
            self,
            selector: #selector(appActivated(_:)),
            name: NSWorkspace.didActivateApplicationNotification,
            object: nil
        )
    }

    @objc func appActivated(_ notification: Notification) {
        guard let app = notification.userInfo?[NSWorkspace.applicationUserInfoKey]
                as? NSRunningApplication,
              let name = app.localizedName else { return }

        // Re-read config on every event so Pause/Resume + allowlist changes are instant.
        let config = loadConfig(at: configPath)
        guard config.enabled else { return }

        let status = config.allowlist.contains(name) ? "Ignored" : "Enabled"
        if status == "Enabled" { _ = switchSource(to: config.targetLayout) }

        saveState(State(currentApp: name, status: status), at: statePath)
    }
}

// MARK: - Entry point

guard CommandLine.arguments.count > 1 else {
    fputs("usage: daemon <support-path>\n", stderr)
    exit(1)
}

// Connect to the window server so NSWorkspace notifications are delivered.
// .prohibited = no Dock icon, no App Switcher entry.
let app = NSApplication.shared
app.setActivationPolicy(.prohibited)

let supportPath = CommandLine.arguments[1]
let pidPath = supportPath + "/daemon.pid"

try? String(ProcessInfo.processInfo.processIdentifier)
    .write(toFile: pidPath, atomically: true, encoding: .utf8)

let switcher = AppSwitcher(supportPath: supportPath)
switcher.start()

func cleanup() {
    try? FileManager.default.removeItem(atPath: pidPath)
}

signal(SIGTERM) { _ in cleanup(); exit(0) }
signal(SIGINT)  { _ in cleanup(); exit(0) }

RunLoop.main.run()
