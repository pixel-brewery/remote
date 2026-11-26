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
headers and shutdown. Host/Origin checks reject foreign browser callers.
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

See the generated [API reference](../../.docs/packages/remote-node/api/index.md)
and the independent [host fixtures](../../apps/fixture-host/README.md).
