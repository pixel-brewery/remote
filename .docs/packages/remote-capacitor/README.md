# remote-capacitor native view capability

The native runtime gives the WebView a distinct ephemeral loopback capability,
`remote_local`, for the protected gateway origin. The remote device credential
never enters the WebView. Generated TypeScript declarations live in the
[API reference](api/index.md); this page documents native behavior TypeDoc cannot see.

## Android lifecycle

Activating a view recreates the Capacitor bridge with the gateway origin as its
server URL. Capacitor's built-in `CapacitorCookies` plugin calls
`CookieManager.removeSessionCookies()` whenever a bridge loads and when it is
destroyed, so a session cookie installed before recreation is gone by the time
the protected view loads.

`RemotePlugin` therefore installs a persistent, bounded cookie:

```text
remote_local=<64 hex>; Path=/; Max-Age=43200; HttpOnly; SameSite=Strict
```

- The write is confirmed and `CookieManager.flush()` completes before the
  Activity recreates its bridge.
- Each bridge load and Activity resume refreshes `Max-Age` while the activation
  is active. The capability is kept in process memory only for that refresh.
- Closing or forgetting the active connection, replacing it with another view
  and `RemoteNativeConfiguration.dispose()` expire the cookie
  (`Max-Age=0` plus a past `Expires`) and flush the removal.
- The 12-hour bound limits how long a capability of a gateway that died with its
  process can remain stored. Such a value is useless: every gateway generates a
  new capability, and WebView navigation stays limited to the packaged and the
  active loopback origin.

## iOS lifecycle

Capacitor iOS does not clear session cookies when a bridge is recreated, and the
recreated bridge uses the same WebKit data store, so the session cookie installed
before `activateView` survives that recreation. `RemoteNativeHost` now removes
the capability when the active connection is closed or forgotten and on
`dispose()`, from the WebKit cookie store and from `HTTPCookieStorage.shared`,
into which Capacitor's cookie observer mirrors WebKit cookies. Cookies are not
port-scoped, so a replacement view's capability overwrites the previous one.

## Verification

Android JVM tests cover the cookie header contract (`RemoteLocalCookieTest`).
The iOS simulator test `RemoteNativeHostTests` installs a capability in a
non-persistent WebKit store and checks that only the matching close removes it.
Device journeys with a real bridge recreation remain separate evidence; see the
[testing guide](../../guides/testing.md#reproduce-the-platform-checks).
