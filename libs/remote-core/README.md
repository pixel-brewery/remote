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

`RemoteRouteRegistry` admits exact methods and canonical paths. A complete named
parameter such as `:id` matches one nonempty segment. Exact routes outrank
parameters; equally specific overlaps fail closed. Queries are outside admission.
Unknown operations, reserved SDK paths, malformed declarations, missing
capabilities and automatic mutation-replay declarations are denied. Product
resource and state authorization still runs after capability admission.

See the generated [API reference](../../.docs/packages/remote-core/api/index.md).
