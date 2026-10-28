#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

@interface NativeBridgeHandler : NSObject <WKScriptMessageHandler>
@property (nonatomic, weak) WKWebView *webView;
@property (nonatomic, strong) NSURLSession *session;
@end

@implementation NativeBridgeHandler

- (instancetype)init {
    self = [super init];
    if (self) {
        NSURLSessionConfiguration *config = [NSURLSessionConfiguration defaultSessionConfiguration];
        config.timeoutIntervalForRequest = 9.0;
        config.timeoutIntervalForResource = 12.0;
        config.HTTPAdditionalHeaders = @{
            @"User-Agent": @"RadiantKepler/1.0 (Macintosh; Intel Mac OS X) NativeMarketIntelligence",
            @"Accept": @"application/json, application/rss+xml, application/xml, text/xml, text/plain, */*"
        };
        _session = [NSURLSession sessionWithConfiguration:config];
    }
    return self;
}

- (void)userContentController:(WKUserContentController *)userContentController
      didReceiveScriptMessage:(WKScriptMessage *)message {
    if (![message.name isEqualToString:@"nativeBridge"]) return;
    if (![message.body isKindOfClass:[NSDictionary class]]) return;

    NSDictionary *body = (NSDictionary *)message.body;
    NSString *action = body[@"action"];
    if ([action isEqualToString:@"log"]) {
        NSString *msg = [NSString stringWithFormat:@"%@\n", body[@"message"] ?: @""];
        NSString *logPath = @"/tmp/rk_webview.log";
        if (![[NSFileManager defaultManager] fileExistsAtPath:logPath]) {
            [msg writeToFile:logPath atomically:YES encoding:NSUTF8StringEncoding error:nil];
        } else {
            NSFileHandle *fh = [NSFileHandle fileHandleForWritingAtPath:logPath];
            [fh seekToEndOfFile];
            [fh writeData:[msg dataUsingEncoding:NSUTF8StringEncoding]];
            [fh closeFile];
        }
        return;
    }

    NSString *reqId = body[@"id"];
    NSString *urlStr = body[@"url"];

    if (!reqId || ![action isEqualToString:@"fetch_url"] || !urlStr) return;

    NSURL *url = [NSURL URLWithString:urlStr];
    if (!url) {
        [self sendCallbackError:reqId message:@"Invalid URL"];
        return;
    }

    NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
    request.HTTPMethod = @"GET";

    __weak typeof(self) weakSelf = self;
    NSURLSessionDataTask *task = [self.session dataTaskWithRequest:request
                                                 completionHandler:^(NSData *data, NSURLResponse *response, NSError *error) {
        if (error || !data) {
            [weakSelf sendCallbackError:reqId message:error ? error.localizedDescription : @"Empty response"];
            return;
        }
        NSString *text = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
        if (!text) {
            text = [[NSString alloc] initWithData:data encoding:NSISOLatin1StringEncoding] ?: @"";
        }
        [weakSelf sendCallbackSuccess:reqId payload:text];
    }];
    [task resume];
}

- (NSString *)jsonQuoteString:(NSString *)str {
    if (!str) return @"\"\"";
    NSData *data = [NSJSONSerialization dataWithJSONObject:@[str] options:0 error:nil];
    if (!data) return @"\"\"";
    NSString *arrStr = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    if (arrStr.length >= 2) {
        return [arrStr substringWithRange:NSMakeRange(1, arrStr.length - 2)];
    }
    return @"\"\"";
}

- (void)sendCallbackSuccess:(NSString *)reqId payload:(NSString *)payload {
    NSString *quotedPayload = [self jsonQuoteString:payload];
    NSString *js = [NSString stringWithFormat:
        @"if (window.__RK_NATIVE_CALLBACKS__ && window.__RK_NATIVE_CALLBACKS__[\"%@\"]) {"
         "  window.__RK_NATIVE_CALLBACKS__[\"%@\"].resolve(%@);"
         "  delete window.__RK_NATIVE_CALLBACKS__[\"%@\"];"
         "}", reqId, reqId, quotedPayload, reqId];
    __weak typeof(self) weakSelf = self;
    dispatch_async(dispatch_get_main_queue(), ^{
        [weakSelf.webView evaluateJavaScript:js completionHandler:nil];
    });
}

- (void)sendCallbackError:(NSString *)reqId message:(NSString *)msg {
    NSString *quotedMsg = [self jsonQuoteString:msg];
    NSString *js = [NSString stringWithFormat:
        @"if (window.__RK_NATIVE_CALLBACKS__ && window.__RK_NATIVE_CALLBACKS__[\"%@\"]) {"
         "  window.__RK_NATIVE_CALLBACKS__[\"%@\"].reject(new Error(%@));"
         "  delete window.__RK_NATIVE_CALLBACKS__[\"%@\"];"
         "}", reqId, reqId, quotedMsg, reqId];
    __weak typeof(self) weakSelf = self;
    dispatch_async(dispatch_get_main_queue(), ^{
        [weakSelf.webView evaluateJavaScript:js completionHandler:nil];
    });
}

@end

@interface AppDelegate : NSObject <NSApplicationDelegate, WKUIDelegate, WKNavigationDelegate>
@property (nonatomic, strong) NSWindow *window;
@property (nonatomic, strong) WKWebView *webView;
@property (nonatomic, strong) NativeBridgeHandler *bridgeHandler;
@end

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)notification {
    if (@available(macOS 10.14, *)) {
        NSApp.appearance = [NSAppearance appearanceNamed:NSAppearanceNameDarkAqua];
    }

    NSRect screenRect = [NSScreen mainScreen] ? [[NSScreen mainScreen] visibleFrame] : NSMakeRect(0, 0, 1520, 940);
    CGFloat winWidth = MIN(1540.0, screenRect.size.width * 0.94);
    CGFloat winHeight = MIN(960.0, screenRect.size.height * 0.92);
    NSRect winRect = NSMakeRect(
        screenRect.origin.x + (screenRect.size.width - winWidth) / 2.0,
        screenRect.origin.y + (screenRect.size.height - winHeight) / 2.0,
        winWidth,
        winHeight
    );

    NSWindowStyleMask mask = NSWindowStyleMaskTitled | NSWindowStyleMaskClosable | NSWindowStyleMaskMiniaturizable | NSWindowStyleMaskResizable;
    self.window = [[NSWindow alloc] initWithContentRect:winRect
                                              styleMask:mask
                                                backing:NSBackingStoreBuffered
                                                  defer:NO];
    self.window.title = @"Radiant Kepler — Crypto Market Intelligence & Good-Faith Predictions";
    self.window.minSize = NSMakeSize(1100, 700);
    self.window.backgroundColor = [NSColor colorWithCalibratedRed:0.024 green:0.035 blue:0.067 alpha:1.0];

    WKUserContentController *contentController = [[WKUserContentController alloc] init];
    self.bridgeHandler = [[NativeBridgeHandler alloc] init];
    [contentController addScriptMessageHandler:self.bridgeHandler name:@"nativeBridge"];

    WKWebViewConfiguration *webConfig = [[WKWebViewConfiguration alloc] init];
    webConfig.userContentController = contentController;
    [webConfig.preferences setValue:@YES forKey:@"developerExtrasEnabled"];

    self.webView = [[WKWebView alloc] initWithFrame:self.window.contentView.bounds configuration:webConfig];
    self.webView.autoresizingMask = NSViewWidthSizable | NSViewHeightSizable;
    self.webView.UIDelegate = self;
    self.webView.navigationDelegate = self;
    [self.webView setValue:@NO forKey:@"drawsBackground"];
    self.bridgeHandler.webView = self.webView;

    [self.window.contentView addSubview:self.webView];
    [self setupMainMenu];
    [self loadFrontend];

    [self.window makeKeyAndOrderFront:nil];
    [NSApp activateIgnoringOtherApps:YES];
}

- (void)loadFrontend {
    NSURL *bundleHtml = [[NSBundle mainBundle] URLForResource:@"index" withExtension:@"html" subdirectory:@"dist"];
    if (bundleHtml && [[NSFileManager defaultManager] fileExistsAtPath:bundleHtml.path]) {
        [self.webView loadFileURL:bundleHtml allowingReadAccessToURL:[bundleHtml URLByDeletingLastPathComponent]];
        return;
    }

    NSString *cwd = [[NSFileManager defaultManager] currentDirectoryPath];
    NSURL *cwdCandidate = [NSURL fileURLWithPath:[cwd stringByAppendingPathComponent:@"dist/index.html"]];
    if ([[NSFileManager defaultManager] fileExistsAtPath:cwdCandidate.path]) {
        [self.webView loadFileURL:cwdCandidate allowingReadAccessToURL:[cwdCandidate URLByDeletingLastPathComponent]];
    }
}

- (WKWebView *)webView:(WKWebView *)webView
createWebViewWithConfiguration:(WKWebViewConfiguration *)configuration
   forNavigationAction:(WKNavigationAction *)navigationAction
        windowFeatures:(WKWindowFeatures *)windowFeatures {
    if (!navigationAction.targetFrame && navigationAction.request.URL) {
        [[NSWorkspace sharedWorkspace] openURL:navigationAction.request.URL];
    }
    return nil;
}

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)sender {
    return YES;
}

- (void)setupMainMenu {
    NSMenu *mainMenu = [[NSMenu alloc] init];
    NSMenuItem *appMenuItem = [[NSMenuItem alloc] init];
    [mainMenu addItem:appMenuItem];

    NSMenu *appMenu = [[NSMenu alloc] init];
    [appMenu addItemWithTitle:@"Reload Intelligence UI" action:@selector(reloadWebView) keyEquivalent:@"r"];
    [appMenu addItem:[NSMenuItem separatorItem]];
    [appMenu addItemWithTitle:@"Quit Radiant Kepler" action:@selector(terminate:) keyEquivalent:@"q"];
    appMenuItem.submenu = appMenu;
    NSApp.mainMenu = mainMenu;
}

- (void)reloadWebView {
    [self.webView reload];
}

@end

int main(int argc, const char * argv[]) {
    @autoreleasepool {
        NSApplication *app = [NSApplication sharedApplication];
        AppDelegate *delegate = [[AppDelegate alloc] init];
        app.delegate = delegate;
        [app setActivationPolicy:NSApplicationActivationPolicyRegular];
        [app run];
    }
    return 0;
}
