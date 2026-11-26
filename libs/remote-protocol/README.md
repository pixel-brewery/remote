# @pixel-brewery/remote-protocol

Canonical Zod wire contracts for product-neutral remote access. This portable ESM
package contains identities, endpoint descriptors, one-use pairing messages,
credential-free sessions, typed failures, native connection control, explicit
operation metadata and streaming byte ports. It imports no platform adapter.

Every peer validates protocol input and output with the exported schemas. Version
one rejects unknown fields. Product payload schemas remain with the application.
The stable `{ appId, hostId }` namespace is independent of IP addresses and ports.

```ts
import {
    createRemotePairingUrl,
    remotePairingBootstrapSchema,
    remoteHostDescriptorSchema,
} from '@pixel-brewery/remote-protocol';

const invitation = remotePairingBootstrapSchema.parse(outOfBandInvitation);
const qrValue = createRemotePairingUrl(invitation);
const host = remoteHostDescriptorSchema.parse(untrustedDescriptor);
```

Pairing URLs place the challenge in a fragment, outside the HTTP request and
referrer. Treat the URL as temporary secret material. Browser pairing uses an
HttpOnly cookie; native pairing carries a wire bearer that the privileged adapter
protects and removes before returning application state.

`remoteHostStatusSchema` validates the private host-administration snapshot an
application serves only to its own local host view: listener state, the public
descriptor, activation intent, paired device metadata and consumed pending
pairings (`IRemoteHostStatusSnapshot`). It mirrors the Node host status and
rejects unknown fields at every level, so token hashes, credentials and pairing
challenges cannot enter a browser projection.

`normalizeRemotePath` produces a canonical decoded admission path without its
query. It rejects authorities, traversal, encoded separators, controls and
ambiguous repeated escapes. `isPrivateAddress` recognizes complete numeric
RFC 1918 IPv4 and RFC 4193 IPv6; it excludes loopback, scoped and public addresses.
Runtime connectors enforce the destination policy and explicit test exceptions.

`IRemoteByteResponse.body` must be consumed or canceled. The transport never
replays a write. Applications decide product idempotency and how to reconcile an
`unknown-outcome` failure. Certificates, issuer configuration, domains, business
payloads and product identifiers are application responsibilities.

See the generated [API reference](../../.docs/packages/remote-protocol/api/index.md).
