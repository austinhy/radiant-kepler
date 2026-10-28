import Cocoa
import WebKit

class NativeBridgeHandler: NSObject, WKScriptMessageHandler {
    weak var webView: WKWebView?
    private let session: URLSession

    override init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 9.0
        config.timeoutIntervalForResource = 12.0
        config.httpAdditionalHeaders = [
            "User-Agent": "RadiantKepler/1.0 (Macintosh; Intel Mac OS X) NativeMarketIntelligence",
            "Accept": "application/json, application/rss+xml, application/xml, text/xml, text/plain, */*"
        ]
        self.session = URLSession(configuration: config)
        super.init()
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "nativeBridge",
              let body = message.body as? [String: Any],
              let reqId = body["id"] as? String,
              let action = body["action"] as? String else {
            return
        }

        if action == "fetch_url", let urlStr = body["url"] as? String, let url = URL(string: urlStr) {
            var request = URLRequest(url: url)
            request.httpMethod = "GET"

            let task = session.dataTask(with: request) { [weak self] data, response, error in
                if let error = error {
                    self?.sendCallbackError(reqId: reqId, message: error.localizedDescription)
                    return
                }
                guard let data = data else {
                    self?.sendCallbackError(reqId: reqId, message: "Empty response")
                    return
                }
                let text = String(data: data, encoding: .utf8)
                    ?? String(data: data, encoding: .isoLatin1)
                    ?? ""
                self?.sendCallbackSuccess(reqId: reqId, payload: text)
            }
            task.resume()
        }
    }

    private func sendCallbackSuccess(reqId: String, payload: String) {
        guard let encodedData = try? JSONEncoder().encode(payload),
              let jsonString = String(data: encodedData, encoding: .utf8) else {
            return
        }
        let js = """
        if (window.__RK_NATIVE_CALLBACKS__ && window.__RK_NATIVE_CALLBACKS__["\(reqId)"]) {
            window.__RK_NATIVE_CALLBACKS__["\(reqId)"].resolve(\(jsonString));
            delete window.__RK_NATIVE_CALLBACKS__["\(reqId)"];
        }
        """
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }

    private func sendCallbackError(reqId: String, message: String) {
        guard let encodedData = try? JSONEncoder().encode(message),
              let jsonString = String(data: encodedData, encoding: .utf8) else {
            return
        }
        let js = """
        if (window.__RK_NATIVE_CALLBACKS__ && window.__RK_NATIVE_CALLBACKS__["\(reqId)"]) {
            window.__RK_NATIVE_CALLBACKS__["\(reqId)"].reject(new Error(\(jsonString)));
            delete window.__RK_NATIVE_CALLBACKS__["\(reqId)"];
        }
        """
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(js, completionHandler: nil)
        }
    }
}

class AppDelegate: NSObject, NSApplicationDelegate, WKUIDelegate, WKNavigationDelegate {
    var window: NSWindow!
    var webView: WKWebView!
    var bridgeHandler: NativeBridgeHandler!

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.appearance = NSAppearance(named: .darkAqua)

        let screenRect = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1520, height: 940)
        let winWidth = min(1540.0, screenRect.width * 0.94)
        let winHeight = min(960.0, screenRect.height * 0.92)
        let winRect = NSRect(
            x: screenRect.origin.x + (screenRect.width - winWidth) / 2.0,
            y: screenRect.origin.y + (screenRect.height - winHeight) / 2.0,
            width: winWidth,
            height: winHeight
        )

        window = NSWindow(
            contentRect: winRect,
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.title = "Radiant Kepler — Crypto Market Intelligence & Good-Faith Predictions"
        window.minSize = NSSize(width: 1100, height: 700)
        window.backgroundColor = NSColor(calibratedRed: 0.024, green: 0.035, blue: 0.067, alpha: 1.0)
        window.titlebarAppearsTransparent = false

        let contentController = WKUserContentController()
        bridgeHandler = NativeBridgeHandler()
        contentController.add(bridgeHandler, name: "nativeBridge")

        let webConfig = WKWebViewConfiguration()
        webConfig.userContentController = contentController
        webConfig.preferences.setValue(true, forKey: "developerExtrasEnabled")

        webView = WKWebView(frame: window.contentView!.bounds, configuration: webConfig)
        webView.autoresizingMask = [.width, .height]
        webView.uiDelegate = self
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground")
        bridgeHandler.webView = webView

        window.contentView?.addSubview(webView)
        setupMainMenu()

        loadFrontend()

        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
    }

    func loadFrontend() {
        // 1. Check bundled Resources/dist/index.html
        if let bundleHtml = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "dist") {
            webView.loadFileURL(bundleHtml, allowingReadAccessTo: bundleHtml.deletingLastPathComponent())
            return
        }

        // 2. Check relative to executable or current directory
        let execURL = URL(fileURLWithPath: CommandLine.arguments[0]).standardizedFileURL
        let candidates = [
            URL(fileURLWithPath: FileManager.default.currentDirectoryPath).appendingPathComponent("dist/index.html"),
            execURL.deletingLastPathComponent().appendingPathComponent("../../../dist/index.html").standardizedFileURL,
            execURL.deletingLastPathComponent().appendingPathComponent("../Resources/dist/index.html").standardizedFileURL
        ]

        for candidate in candidates {
            if FileManager.default.fileExists(atPath: candidate.path) {
                webView.loadFileURL(candidate, allowingReadAccessTo: candidate.deletingLastPathComponent())
                return
            }
        }
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if navigationAction.targetFrame == nil, let url = navigationAction.request.url {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    private func setupMainMenu() {
        let mainMenu = NSMenu()
        let appMenuItem = NSMenuItem()
        mainMenu.addItem(appMenuItem)

        let appMenu = NSMenu()
        appMenu.addItem(
            withTitle: "Reload Intelligence UI",
            action: #selector(reloadWebView),
            keyEquivalent: "r"
        )
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(
            withTitle: "Quit Radiant Kepler",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q"
        )
        appMenuItem.submenu = appMenu
        NSApp.mainMenu = mainMenu
    }

    @objc func reloadWebView() {
        webView.reload()
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
