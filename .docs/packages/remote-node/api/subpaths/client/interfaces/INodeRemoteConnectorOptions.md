# Interface: INodeRemoteConnectorOptions

Native connection policy; the app owns protected credentials and optional TLS trust roots.

## Properties

### allowLoopbackForTests?

> `readonly` `optional` **allowLoopbackForTests?**: `boolean`

Test-only exception for numeric loopback destinations. Production configuration must omit this flag.

***

### certificateAuthority?

> `readonly` `optional` **certificateAuthority?**: `string` \| `Buffer`\<`ArrayBufferLike`\>

Optional application-approved PEM trust anchor. Server certificate verification remains enabled.

***

### credentialStore

> `readonly` **credentialStore**: `IRemoteCredentialStore`

Application-owned protected credential store; renderer code must not receive this port.

***

### expectedIdentity

> `readonly` **expectedIdentity**: `IRemoteHostIdentity`

App and installation identity verified before reading or sending any stored device credential.

***

### maxConcurrentRequests?

> `readonly` `optional` **maxConcurrentRequests?**: `number`

Maximum owned requests or local forwarding operations, default 64.

***

### requestTimeoutMs?

> `readonly` `optional` **requestTimeoutMs?**: `number`

Maximum time to receive response headers or finish a WebSocket handshake, default fifteen seconds.

***

### routes

> `readonly` **routes**: readonly `IRemoteRouteDefinition`[]

Operations admitted by this native connection. They must match the application host registry. Unknown operations never reach the selected peer.

***

### transportId?

> `readonly` `optional` **transportId?**: `"lan-http"` \| `"lan-https"`

Identifier of the registered transport connector used for this endpoint.
