# Interface: IRemoteOpenApiOperation

Structural view of one OpenAPI operation as read by remote route derivation.

## Properties

### operationId?

> `readonly` `optional` **operationId?**: `string`

Stable operation identifier, used unchanged as the remote route identifier.

#### Remarks

Admitted operations require a nonempty identifier of at most 160 characters
that is unique across the derived route set.

***

### responses?

> `readonly` `optional` **responses?**: `Readonly`\<`Record`\<`string`, [`IRemoteOpenApiResponse`](IRemoteOpenApiResponse.md) \| `undefined`\>\>

Declared responses keyed by status code; their media types select the event-stream kind.
