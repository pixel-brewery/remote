# Interface: IRemoteOpenApiResponse

Structural view of one OpenAPI response or response reference.

## Remarks

References are not resolved, so a referenced response never marks an
operation as an event stream. Declare `text/event-stream` inline for SSE.

## Properties

### $ref?

> `readonly` `optional` **$ref?**: `string`

Unresolved component reference; present only for reference responses.

***

### content?

> `readonly` `optional` **content?**: `Readonly`\<`Record`\<`string`, `unknown`\>\>

Response media types; a `text/event-stream` entry, with or without parameters, derives an SSE route.
