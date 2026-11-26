# Integrate Remote

## Host responsibilities

Provide a stable `appId` and persist the generated installation identity in the
application's private storage. Supply the access store, registered operations,
application dispatcher and packaged asset root to the Node host. Start and stop
the host through the application's supervised lifecycle. A persisted enabled
preference is separate from current network availability.

For each operation register its method/path, capabilities, streaming kind,
resource limits and retry policy. Dispatch original streams to the application's
canonical validation and authorization pipeline. A successful device pairing
does not authorize an operation missing from that registry.

Keep session credentials out of product snapshots, error messages and logs.
Integrate device revocation with the settings surface that owns remote access.
Use typed protocol errors to select product-owned localized messages.

## Browser clients

Serve the client assets and registered API from the same origin. Bootstrap the
remote session before loading product data. Use the browser connector's cookie
credentials and fragment adapter. A product API failure is distinct from session
denial and must not force another QR scan after successful pairing.

The browser's ordinary camera application can open the pairing URL. A desktop
client can paste that same URL. Do not require camera APIs on an insecure HTTP
page. The operation-ID factory uses cryptographically secure random bytes that
remain available in HTTP LAN contexts.

## Native clients

Configure the Electron or Capacitor runtime with the application asset root and
explicit operation registry. Bind the local view to one saved connection. Install
the ephemeral local capability before the view loads. The renderer/WebView never
selects arbitrary upstream URLs or supplies authorization headers.

Use existing application views and client contracts through the local gateway.
Keep provider media that is intentionally client-direct on its original HTTPS
path. Host-relative application files use the connection's content URL adapter.
Closing the view, forgetting a connection, switching hosts or revoking access
cancels its local and remote streams.

## Certificates

Applications own certificate procurement, renewal, protected keys and trust
configuration. Supply current material through the Node HTTPS adapter's TLS
provider. Remote validates and applies material; it does not register domains,
operate a CA, distribute a shared private key or silently disable validation.

## Consumer-specific ownership

Symphony maps typed remote operations to existing application use cases and keeps
host configuration separate from remote display configuration. Weasel admits
verified remote requests to its existing controller graph, preserving OpenAPI,
generated clients and business authorization. Neither product exports its entire
internal request surface merely because a client is paired.
