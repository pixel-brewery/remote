# @pixel-brewery/remote-browser

Same-origin browser adapters for the headless Remote client. The host serves the application's packaged web assets and registered operations on the same origin. Browser pairing uses an HttpOnly device cookie; JavaScript never receives a native bearer credential. Redirects and caller-provided authority headers are denied.

Compose `BrowserRemoteConnector` with the exact document origin and a bound `window.fetch`. Create `RemoteSession` with the expected product/installation identity, connector, `createBrowserClock(window)` and `() => createBrowserOperationId(crypto)`. Imports perform no browser I/O. Initialization verifies host metadata and restores the cookie session; product requests preserve streaming and cancellation.

`BrowserPairingLocation` reads the shared `#pair=...&app=...&host=...&expires=...` invitation and rejects duplicate fields. The fragment is never sent in HTTP requests. Clear it after a durable successful pairing, keeping pending attempts recoverable. `createBrowserOperationId()` uses `crypto.getRandomValues`; it works in an HTTP LAN document without requiring secure-context-only `crypto.randomUUID()`.

The generic byte-port uses `requestBodyMode: 'buffered-http1'` by default: Chromium Fetch upload streams require HTTP/2 or HTTP/3, so ordinary HTTP/1 LAN and protected loopback requests use a bounded payload prepared before one dispatch. `maximumBufferedRequestBytes` defaults to 8MiB; exceeding it fails before networking, and cancellation stops body preparation. Set `requestBodyMode: 'streaming-fetch'` explicitly only for a supported browser/server combination. There is no retry-after-failed-stream fallback and no mutation replay. See [Chrome's request-streaming restrictions](https://developer.chrome.com/docs/capabilities/web-apis/fetch-streaming-requests).

This byte-port limit does not patch or replace the application's existing HTTP client. Normal same-origin `fetch`, XMLHttpRequest, FormData, File and Blob uploads continue through the original host/native-gateway request body, with product route limits and native streaming/cancellation. Response bytes, SSE, WebSockets and media Range remain streaming paths.

`readRemoteServerEvents()` incrementally parses UTF-8 SSE across chunk/CRLF boundaries and bounds retained event bytes. It does not infer JSON or event replay. `BrowserRemoteEvents` supplies bounded same-origin WebSocket lifecycle and read-reconciliation callbacks without queuing or replaying writes. Products validate event payloads and own domain caches.

HTTP LAN is explicitly unencrypted. Access requires the user-selected local network and one-time invitation, followed by a scoped device grant. The SDK includes no product domain, certificate, signing key or cloud issuer. Applications may supply their own HTTPS infrastructure later. Browser camera, service-worker and other secure-context features are not assumed; native QR scanning is provided by the Capacitor adapter.

Run `yarn nx run remote-browser:build`, `:typecheck` and `:test`. Focused tests cover same-origin admission, protocol-body cancellation, credential exclusion, bounded SSE and HTTP-safe IDs. The shared browser/Electron/mobile acceptance UI lives in `apps/fixture-browser`.
