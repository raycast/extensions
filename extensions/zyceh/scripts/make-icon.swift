import Cocoa

let size: Int = 512
let f = CGFloat(size)

func makeRep() -> NSBitmapImageRep {
    NSBitmapImageRep(
        bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size,
        bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false,
        colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0
    )!
}

func save(_ rep: NSBitmapImageRep, to path: String) {
    let png = rep.representation(using: .png, properties: [:])!
    try! png.write(to: URL(fileURLWithPath: path))
    print("wrote \(path)")
}

// Raycast list icon: dark Z on light rounded background
func drawListIcon(_ rep: NSBitmapImageRep) {
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let ctx = NSGraphicsContext.current!.cgContext
    ctx.clear(CGRect(x: 0, y: 0, width: f, height: f))

    let bg = CGPath(roundedRect: CGRect(x: 0, y: 0, width: f, height: f), cornerWidth: 90, cornerHeight: 90, transform: nil)
    ctx.setFillColor(NSColor(calibratedWhite: 0.92, alpha: 1).cgColor)
    ctx.addPath(bg); ctx.fillPath()

    let font = NSFont.systemFont(ofSize: 440, weight: .black)
    let str = NSAttributedString(string: "Z", attributes: [
        .font: font,
        .foregroundColor: NSColor(calibratedWhite: 0.20, alpha: 1.0),
    ])
    let sz = str.size()
    str.draw(at: NSPoint(x: (f - sz.width) / 2 + 8, y: (f - sz.height) / 2))

    let pad: CGFloat = 52
    ctx.setStrokeColor(NSColor(calibratedWhite: 0.25, alpha: 1.0).cgColor)
    ctx.setLineWidth(36); ctx.setLineCap(.round)
    ctx.move(to: CGPoint(x: pad, y: f - pad))
    ctx.addLine(to: CGPoint(x: f - pad, y: pad))
    ctx.strokePath()
}

// Toolbar icon: transparent Z cutout, optional reduced opacity for paused state
func drawToolbarIcon(_ rep: NSBitmapImageRep, alpha: CGFloat = 1.0) {
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
    let ctx = NSGraphicsContext.current!.cgContext
    ctx.clear(CGRect(x: 0, y: 0, width: f, height: f))
    ctx.setAlpha(alpha)

    let bg = CGPath(roundedRect: CGRect(x: 0, y: 0, width: f, height: f), cornerWidth: 90, cornerHeight: 90, transform: nil)
    ctx.setFillColor(NSColor(calibratedWhite: 0.92, alpha: 1).cgColor)
    ctx.addPath(bg); ctx.fillPath()

    let font = NSFont.systemFont(ofSize: 440, weight: .black)
    let str = NSAttributedString(string: "Z", attributes: [
        .font: font,
        .foregroundColor: NSColor.black,
    ])
    let sz = str.size()
    ctx.setBlendMode(.clear)
    str.draw(at: NSPoint(x: (f - sz.width) / 2 + 8, y: (f - sz.height) / 2))
    ctx.setBlendMode(.normal)

    let pad: CGFloat = 52
    ctx.setStrokeColor(NSColor(calibratedWhite: 0.25, alpha: 1.0).cgColor)
    ctx.setLineWidth(36); ctx.setLineCap(.round)
    ctx.move(to: CGPoint(x: pad, y: f - pad))
    ctx.addLine(to: CGPoint(x: f - pad, y: pad))
    ctx.strokePath()
}

let listRep = makeRep(); drawListIcon(listRep);        save(listRep, to: "assets/icon.png")
let activeRep = makeRep(); drawToolbarIcon(activeRep);  save(activeRep, to: "assets/toolbar-icon.png")
let pausedRep = makeRep(); drawToolbarIcon(pausedRep, alpha: 0.35); save(pausedRep, to: "assets/toolbar-icon-paused.png")
