# @pixel-brewery/remote-core

Portable authorization and scoped route admission. Applications inject the
atomic access store, UTC clock, cryptographic primitives and identity namespace.
There is no network listener, credential vault, certificate issuer or product
model in this package.

`RemoteAccessService.initialize()` validates persisted state. A new record starts
disabled. Mutations use one serialized writer; a failed save preserves the last
committed grant state. Use exactly one active writer for each installation file.
Foreign or malformed restoration records fail closed.

Enable access explicitly, then create an invitation for an advertised endpoint.
The default invitation has 32 bytes of entropy and expires after five minutes.
Only its hash is retained. The first completion binds a stable attempt ID, device
label and credential mode. Repeating that exact attempt recovers its same result;
another attempt cannot consume it. Bounded transient retry records expire with
the invitation. Device credentials remain valid until revoked.

QR possession is the default authorization policy. An application may opt into
`host-approval`: completion returns pending; local administration approves or
rejects the pairing ID and the client repeats its original attempt. Approval and
rejection are serialized with durable grants. `getStatus()` excludes both
plaintext credentials and hashes.

Revocation commits before emitting its event. Hosts must synchronously cancel
that device's existing requests and event connections. Failed persistence leaves
the grant in its previous state and reports a typed error. Stopping or rebinding
a transport must invalidate pending invitations.

`subscribe()` observers receive `revoked`, `disabled`, `pairings-invalidated`
and `paired` events synchronously after the corresponding commit. `paired`
carries only the new device ID and follows the durable grant, whether by QR
possession or host approval; a failed save emits nothing. Local administration
can use it to close a displayed invitation. Observers must ignore kinds they do
not handle.

`RemoteRouteRegistry` admits exact methods and canonical paths. A complete named
parameter such as `:id` matches one nonempty segment. Exact routes outrank
parameters; equally specific overlaps fail closed. Queries are outside admission.
Unknown operations, reserved SDK paths, malformed declarations, missing
capabilities and automatic mutation-replay declarations are denied. Product
resource and state authorization still runs after capability admission.

`createRemoteRoutesFromOpenApi(document, policy)` derives registrations from an
application's actual OpenAPI document instead of a second handwritten list. The
document is a minimal structural type, so any generator's output is accepted
without an OpenAPI dependency. The policy is an allowlist of segment-boundary
`include` prefixes with optional `exclude` prefixes. GET and HEAD routes require
`readCapability` and retry as safe reads; POST, PUT, PATCH and DELETE require
`writeCapability` and never retry. An inline `text/event-stream` response makes
an `sse` route without retry. `{name}` segments become `:name`; partial,
duplicate and colon-literal segments fail. Every operation needs a unique
`operationId`. Each route gets an explicit quota from the longest matching
`requestLimits` prefix or the 4 MiB default. The registry validates the result.

```ts
const routes = createRemoteRoutesFromOpenApi(openApiDocument, {
    include: ['/api/documents'],
    exclude: ['/api/documents/export'],
    readCapability: 'documents:read',
    writeCapability: 'documents:write',
    requestLimits: [{ prefix: '/api/documents/uploads', maxRequestBytes: 16777216 }],
});
const sources = createRemoteNativeRouteSources(routes, {
    appId: 'com.example.documents',
    kotlin: { packageName: 'com.example.documents.remote', objectName: 'DocumentRoutes' },
    swift: { typeName: 'DocumentRoutes' },
});
```

`createRemoteNativeRouteSources(routes, options)` emits the same canonical set
as JSON for web clients, Kotlin for `RemoteNativeConfiguration.Route` on Android
and Swift for the iOS constructor. Routes are sorted by path, method and ID, so
generated files are stable under input order. Literals escape quotes,
backslashes, control characters, line separators and Kotlin `$` templates.
Each route needs an explicit `maxRequestBytes` of at most the native 64 MiB
limit. The function writes no file; the application's build owns file
locations and drift checks.

See the generated [API reference](../../.docs/packages/remote-core/api/index.md).
