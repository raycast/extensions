#!/usr/bin/swift

import Foundation
import CoreGraphics

// Using CoreDisplay private framework APIs
@_silgen_name("CoreDisplay_Display_SetUserBrightness")
func CoreDisplay_Display_SetUserBrightness(_ display: CGDirectDisplayID, _ brightness: Double) -> Int32

@_silgen_name("CoreDisplay_Display_GetUserBrightness")
func CoreDisplay_Display_GetUserBrightness(_ display: CGDirectDisplayID, _ brightness: UnsafeMutablePointer<Double>) -> Int32

// Get the brightness of the main display
func getBrightness() -> Double? {
    let displayID = CGMainDisplayID()
    var brightness: Double = 0.0
    
    let result = CoreDisplay_Display_GetUserBrightness(displayID, &brightness)
    
    if result == 0 {
        return brightness
    }
    return nil
}

// Set the brightness of the main display
func setBrightness(_ value: Double) -> Bool {
    let displayID = CGMainDisplayID()
    let result = CoreDisplay_Display_SetUserBrightness(displayID, value)
    return result == 0
}

// Main execution
let args = CommandLine.arguments

if args.count == 1 {
    // No arguments - show current brightness
    if let brightness = getBrightness() {
        print(String(format: "%.2f", brightness))
        exit(0)
    } else {
        fputs("Error: Could not get brightness\n", stderr)
        exit(1)
    }
} else if args.count == 2 {
    let command = args[1]
    
    if command == "-l" || command == "--list" {
        // List format like the brightness tool
        if let brightness = getBrightness() {
            print("display 0: brightness \(String(format: "%.6f", brightness))")
            exit(0)
        } else {
            fputs("Error: Could not get brightness\n", stderr)
            exit(1)
        }
    } else {
        // Set brightness
        guard let value = Double(command), value >= 0.0, value <= 1.0 else {
            fputs("Error: Brightness must be a number between 0.0 and 1.0\n", stderr)
            exit(1)
        }
        
        if setBrightness(value) {
            print("Brightness set to \(String(format: "%.2f", value))")
            exit(0)
        } else {
            fputs("Error: Could not set brightness\n", stderr)
            exit(1)
        }
    }
} else {
    fputs("Usage: brightness-control [-l | value]\n", stderr)
    fputs("  -l, --list    Show current brightness\n", stderr)
    fputs("  value         Set brightness (0.0 - 1.0)\n", stderr)
    exit(1)
}
