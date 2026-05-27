import AppKit

@objc class AppDelegate: NSObject, NSApplicationDelegate {
    private var statusItem: NSStatusItem!
    private var timer: Timer?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)

        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        statusItem.button?.font = NSFont.monospacedDigitSystemFont(ofSize: 12, weight: .regular)

        updateDisplay()

        let t = Timer(timeInterval: 30, target: self, selector: #selector(updateDisplay), userInfo: nil, repeats: true)
        RunLoop.main.add(t, forMode: .common)
        timer = t
    }

    @objc private func updateDisplay() {
        statusItem.button?.title = menuBarTitle()
        statusItem.menu = buildMenu()
    }

    private func menuBarTitle() -> String {
        let bar = miniBar(Progress.year(), width: 8)
        let pct = String(format: "%.0f%%", Progress.year() * 100)
        return "\(bar) \(pct)"
    }

    private func buildMenu() -> NSMenu {
        let menu = NSMenu()
        addRow(to: menu, label: "Year ", value: Progress.year())
        addRow(to: menu, label: "Month", value: Progress.month())
        addRow(to: menu, label: "Day  ", value: Progress.day())
        menu.addItem(.separator())
        let quit = NSMenuItem(
            title: "Quit OSXBar",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q"
        )
        menu.addItem(quit)
        return menu
    }

    private func addRow(to menu: NSMenu, label: String, value: Double) {
        let item = NSMenuItem()
        let bar  = progressBar(value, width: 18)
        let pct  = String(format: "%5.1f%%", value * 100)
        item.attributedTitle = NSAttributedString(
            string: "\(label)  \(bar)  \(pct)",
            attributes: [.font: NSFont.monospacedSystemFont(ofSize: 13, weight: .regular)]
        )
        item.isEnabled = false
        menu.addItem(item)
    }

    private func progressBar(_ value: Double, width: Int) -> String {
        let filled = Int(value * Double(width))
        return String(repeating: "█", count: filled) +
               String(repeating: "░", count: width - filled)
    }

    private func miniBar(_ value: Double, width: Int) -> String {
        let filled = Int(value * Double(width))
        return String(repeating: "▓", count: filled) +
               String(repeating: "░", count: width - filled)
    }
}
