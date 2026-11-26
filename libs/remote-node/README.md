# @pixel-brewery/remote-node

Node adapters for private-LAN hosts, protected native client views, atomic device
storage and cryptography. Applications choose their own identity, routes,
capabilities, canonical product dispatcher, packaged assets, storage path and TLS
provider. Desktop applications run network activity in their Utility Process.

The public entry points are `./host`, `./client`, `./persistence` and `./security`.
The root entry point exposes the host API.

```ts
import { RemoteAccessService } from '@pixel-brewery/remote-core';
import { createRemotePairingUrl } from '@pixel-brewery/remote-protocol';
import { NodeRemoteHost } from '@pixel-brewery/remote-node/host';
import { JsonRemoteAccessStore } from '@pixel-brewery/remote-node/persistence';
import { NodeRemoteSecurity } from '@pixel-brewery/remote-node/security';

const identity = { appId: 'my.product', hostId: installationId };
const access = new RemoteAccessService({
    identity,
    store: new JsonRemoteAccessStore(applicationPrivatePath),
    security: new NodeRemoteSecurity(),
    clock: { now: () => Date.now() },
    capabilities: ['documents:read'],
});
const host = new NodeRemoteHost({
    identity,
    name: 'My Product',
    access,
    routes: applicationRoutes,
    application: canonicalHttpDispatcher,
    assetsPath: immutablePackagedAssets,
});
await host.enable();
const qrValue = createRemotePairingUrl(await host.createPairing());
// Show QR material through the app's local administration surface.
// On application shutdown:
await host.dispose();
```

The default transport is explicitly unencrypted HTTP on one selected private
physical interface. Public, wildcard and DNS bindings are rejected. The normal
port range is 49152–49200. Lifecycle reconciliation handles interface replacement
and invalidates outstanding invitations. Disposal closes owned resources while
retaining the saved activation preference; disabling also persists disabled
intent. A failed disable save keeps the current runtime stopped until an explicit enable; background reconciliation cannot reopen it. Loopback and ephemeral port zero require the explicit test policy.

The dispatcher receives the original request and response streams after device,
route and capability checks. It retains product validation and resource
permissions. Bounds cover request bodies, connections, WebSockets, protocol JSON,
headers and shutdown. A route's `maxRequestBytes` counts bytes where the HTTP
parser enters them into the request stream, including bytes buffered during
admission. It therefore holds for `read()`, `data` listeners, pipes and async
iteration alike, without switching the stream mode; an overrun destroys the
request and aborts the context signal. Host/Origin checks reject foreign browser callers.
Revocation cancels existing HTTP/SSE responses, pending event admission and
WebSockets. Binary Range, multipart boundaries and product query strings retain
their HTTP meaning.

For HTTPS, compose `NodeHttpsLanTransport` with an application-owned
`IRemoteTlsProvider`. It supplies PEM keys, certificates and optional chains and
may signal renewal. Failed renewal preserves the preceding TLS context and
reports a sanitized diagnostic. Each product owns issuance, domains, installation
trust and key storage. No certificate or issuer is distributed by this package.

Native clients use `NodeRemoteConnector` with an expected app/host identity,
protected credential store and explicit route registry. It selects one numeric
private peer, verifies identity before loading a secret, follows no redirects and
never replays a mutation. An application may supply its approved certificate
trust anchor for HTTPS. TLS verification remains enabled.

`NodeLocalGateway` serves trusted packaged assets at an ephemeral `127.0.0.1`
origin. Its `start()` result includes a different ephemeral HttpOnly cookie for
native installation; omit that cookie from renderer state. Registered product
requests flow through the privileged transport with streaming backpressure.
Remote executable responses are refused. Authenticated local host/session
projections permit the same browser session model; DELETE session revokes the
remote device and closes the view. Pairing is not exposed through this gateway.
Close the gateway, then dispose its transport when the native connection ends.

`JsonRemoteAccessStore` validates and flushes an exclusive 0600 temporary file
before atomic replacement. The application owns the containing private directory
and must provide one writer. Missing records restore as absent; malformed or
symbolic-link records fail instead of being silently overwritten.

## Application composition

`RemoteHostRuntime` wraps a `NodeRemoteHost`, or any `IRemoteHostLifecycle`,
for one application process. It serializes initialize, enable, disable,
reconcile, pairing and revocation in one queue of at most 16 running or queued
commands by default (`maxPendingOperations`); a full queue fails with
`resource-limit`. It creates no timer and never polls. `createPairing()`
reconciles the network inside the same queued operation, so invitations name
the current address. Only lifecycle commands set or clear the retained
availability failure that `status()` reports as `unavailable`. `initialize()`
keeps the application usable when restoration fails. `dispose()` lets running
work finish, refuses queued commands, closes the host once and returns the same
promise for every call. `subscribe()` forwards the host's access events, such as
`paired`, and releases its registrations at disposal.

`handleRemoteHostControl(request, response, control, options)` serves a closed
local administration endpoint on plain Node `IncomingMessage`/`ServerResponse`:
`GET <prefix>/status` and `POST <prefix>/enable|disable|reconcile|pair|revoke`
with strict JSON bodies (`{}`, `{ endpointId? }`, `{ deviceId }`). The default
prefix is `/__host/remote/v1` and the default body limit 2 KiB. Queries and
trailing paths return 404, wrong methods 405 with `Allow`, invalid input 422,
oversized declared or streamed bodies 413, a missing control, full queue or
unavailable host 503. Writes return the resulting status; `pair` returns the
secret-bearing invitation. The caller must authorize the local caller first and
must never route device requests here.

`RemoteRequestAdmissions` records which request objects the host admitted, with
`admit(request, context)` returning an idempotent release, `has(request)` and
`context(request)`. Provenance cannot be derived from headers.
`createRemoteApplicationHandler(dispatch, admit)` returns the `application.handle`
implementation for an existing HTTP pipeline. It admits the request and removes
`authorization`, `cookie` and `origin` from the parsed, distinct and raw header
views after SDK authorization. It releases the admission exactly once on
response finish, close or context abort, and rethrows dispatch failures after
that cleanup.

```ts
const admissions = new RemoteRequestAdmissions();
const host = new NodeRemoteHost({
    // identity, name, access, routes, assetsPath as above
    application: {
        handle: createRemoteApplicationHandler(requestListener, (request, context) =>
            admissions.admit(request, context),
        ),
    },
});
const runtime = new RemoteHostRuntime(host);
await runtime.initialize();
// In the locally authorized administration middleware:
await handleRemoteHostControl(request, response, runtime);
// On application shutdown, before closing the pipeline's services:
await runtime.dispose();
```

See the generated [API reference](../../.docs/packages/remote-node/api/index.md)
and the independent [host fixtures](../../apps/fixture-host/README.md).
