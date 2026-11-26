# Interface: IRemoteRequestContext

Trusted context created by the host after device and route authorization.

## Properties

### operationId

> `readonly` **operationId**: `string`

Registered application route identifier selected before the dispatcher is called.

***

### principal

> `readonly` **principal**: [`IRemotePrincipal`](../type-aliases/IRemotePrincipal.md)

Authenticated device identity and its granted capabilities.

***

### requestId

> `readonly` **requestId**: `string`

Opaque correlation identifier unique to this admitted request.

***

### signal

> `readonly` **signal**: `AbortSignal`

Cancellation signal aborted when the caller disconnects, the device is revoked or the transport closes.
