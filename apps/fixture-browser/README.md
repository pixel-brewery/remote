# Shared browser acceptance fixture

Build `yarn nx run fixture-browser:build` and `yarn nx run fixture-host:build`. Start the host fixture with a selected private interface, an application-private authorization file, a separate0600 invitation output file and this build's `dist` directory as packaged assets. The host README documents the `REMOTE_FIXTURE_*` settings. Counter and notes are independent products with distinct app IDs, route registries and data models.

Open the invitation URL in an ordinary browser on the selected LAN. The fragment bootstraps cookie pairing and is removed after success. JSON writes work on HTTP/1. Restore a saved connection, read/write the product data and exercise counter SSE, WebSocket echo, media Range and a normal browser FormData/File upload. Cancel streams and revoke the device explicitly. Browser Forget calls the reachable host's self-revocation endpoint to clear its HttpOnly cookie before removing metadata; native clients can erase their own protected local credential directly.

The same built HTML, JavaScript and Mosaik composition is packaged by the Electron and mobile fixtures. Their native control APIs select a saved host and activate a protected loopback origin inside the app. The UI does not receive a bearer credential, gateway cookie or generic native invocation method.

`yarn nx run fixture-browser:e2e` launches real Chromium and both real host products. It verifies pairing, HTTP/1 writes, original browser FormData, SSE/WebSocket/Range, cookie exclusion, reload restore and revocation. It also checks dark mode, a390px viewport, keyboard focus and horizontal overflow. Evidence and screenshots remain under ignored `output/playwright`. Installed Playwright browser binaries are required. `:typecheck` checks the application source separately from the Vite bundle.

The standard acceptance path requires an active private IPv4 interface and checks that HTTP is an insecure browser context. A machine without such an interface can run an explicitly limited local probe with `REMOTE_FIXTURE_ALLOW_LOOPBACK=1`; its receipt records `explicit-loopback-test`, and it does not establish LAN connectivity or insecure-context browser acceptance.

The catalog/installed-component comparison and checked foundations are documented in [DESIGN.md](DESIGN.md). The full source checker examines the HTML, template-owned saved-connection rows and layout CSS; runtime screenshots complement that static evidence.
