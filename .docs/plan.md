# Remote implementation contract

## Binding architecture

Remote is a product-neutral framework. Protocol schemas own network inputs,
outputs and compatibility. The access core owns pairing and durable device
grants. Portable clients own session state. Runtime adapters own I/O and cleanup.
Dependencies point inward; portable owners cannot import platform adapters.

Applications supply their identity namespace, registered operations, permission
checks, immutable asset roots, storage locations and certificate provider.
Applications retain canonical request/response validation and domain decisions.
There is no generic desktop-IPC forwarder or arbitrary outbound proxy.

## Pairing and authorization

Remote access is disabled by default. A consciously generated QR code or copied
pairing address carries a short-lived, single-use challenge. QR-possession is the
first product policy; explicit host approval is an optional policy. Retrying one
attempt must not create duplicate grants. Only hashes of durable device
credentials are persisted. Public status excludes secrets. Stopping or rebinding
the host invalidates pending challenges.

Every application request is authorized before dispatch. Capabilities do not
replace the application's own resource and state checks. Revocation cancels
existing streams and rejects subsequent requests. Durable mutation failures are
reported, never presented as successful authorization changes.

## Transport and lifecycle

The initial transport is direct HTTP on one selected private LAN interface.
HTTP does not provide network confidentiality or authenticated server identity.
An application's HTTPS adapter consumes its own TLS provider. Certificates,
private issuer keys, domain management and issuance services are not framework
configuration defaults.

Requests preserve HTTP methods, status, relevant headers, bodies and streams.
SSE, WebSocket, multipart and media Range have explicit cleanup and bounds.
Disconnect does not undo an admitted business action. Writes are never blindly
replayed; application idempotency is an explicit operation contract.

Host identity remains stable across endpoints. Sessions select an endpoint and
may coexist. Host replacement aborts the previous connection and clears its
product projection before displaying another host's data.

## Native clients

Native clients load packaged trusted application assets through an authenticated
loopback gateway. The gateway forwards only registered operations to one
selected private peer. Native code holds the remote device credential; the
WebView receives a different ephemeral local capability. No remote executable
content gains a native bridge.

Electron Main mediates encrypted credentials. Utility Process owns network I/O.
Capacitor Android uses a scoped native transport and loopback-only WebView
cleartext exception. iOS uses narrow local networking policy. Both platforms
handle camera/LAN permissions, suspension, stream cancellation and restoration.

## Consumer migration contract

Symphony retains ticket/execution projections and actions. Existing approved
devices are imported without reconstructing plaintext credentials. A safe display
configuration replaces full settings in remote operational views. Host credentials,
paths, setup scripts and local trust grants stay out of the remote projection.

Weasel retains one backend graph, its generated HTTP contracts and existing
portal. A verified remote context admits registered requests to that same
pipeline. The private host launch cookie and local workspace activation remain
separate. The native client does not create another datastore or backend owner.

## Acceptance

The complete delivery includes all nine packages, real browser/Electron/native
fixtures, both product integrations, packed-artifact checks and actual platform
evidence. Source presence and build success are reported separately from executed
journeys. The Cursor repository baseline is recorded in `reference.json`; Remote
uses its own indigo identity and truthful capability documentation.
