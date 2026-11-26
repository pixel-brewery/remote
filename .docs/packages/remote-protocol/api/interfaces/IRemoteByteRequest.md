# Interface: IRemoteByteRequest

Transport request preserving product HTTP semantics and streaming bodies.

## Properties

### body?

> `readonly` `optional` **body?**: `AsyncIterable`\<`Uint8Array`\<`ArrayBufferLike`\>, `any`, `any`\>

Incremental byte stream. Its owner must consume or cancel it to release the connection.

***

### headers?

> `readonly` `optional` **headers?**: `Readonly`\<`Record`\<`string`, `string`\>\>

HTTP header projection. Transport-owned authority and hop-by-hop headers cannot be supplied by callers.

***

### method

> `readonly` **method**: `string`

Exact registered HTTP method. Mutations are dispatched once and never replayed by the transport.

***

### path

> `readonly` **path**: `string`

Origin-form relative path. Complete colon-prefixed segments in route definitions match one parameter.

***

### signal?

> `readonly` `optional` **signal?**: `AbortSignal`

Cancellation signal aborted when the caller disconnects, the device is revoked or the transport closes.
