# Interface: IRemoteOpenApiRequestLimit

Request-body quota applied to every derived route below one path prefix.

## Properties

### maxRequestBytes

> `readonly` **maxRequestBytes**: `number`

Maximum consumed request-body bytes for matching routes; a non-negative safe integer.

***

### prefix

> `readonly` **prefix**: `string`

OpenAPI path prefix matched on complete segments, for example `/api/files`.

#### Remarks

The prefix matches the path itself and every path below it. When several
limits match, the longest prefix wins.
