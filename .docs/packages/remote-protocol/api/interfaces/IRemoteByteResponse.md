# Interface: IRemoteByteResponse

Bounded transport response; cancellation closes its upstream resource.

## Properties

### body

> `readonly` **body**: `AsyncIterable`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Incremental byte stream. Its owner must consume or cancel it to release the connection.

***

### headers

> `readonly` **headers**: `Readonly`\<`Record`\<`string`, `string`\>\>

Relevant response headers, including media type, byte ranges and validators. Authority and hop-by-hop headers are removed.

***

### status

> `readonly` **status**: `number`

HTTP response status returned by the admitted product operation.

## Methods

### cancel()

> **cancel**(): `Promise`\<`void`\>

Cancels the remaining response stream and releases its upstream connection.

#### Returns

`Promise`\<`void`\>

Resolves after the owned stream is canceled and its upstream resource is released.
