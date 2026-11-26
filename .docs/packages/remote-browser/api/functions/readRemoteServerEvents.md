# Function: readRemoteServerEvents()

> **readRemoteServerEvents**(`chunks`, `maxEventBytes?`): `AsyncIterable`\<[`IRemoteServerEvent`](../interfaces/IRemoteServerEvent.md)\>

Decode bounded SSE events incrementally across UTF-8 and CRLF chunk boundaries.

## Parameters

### chunks

`AsyncIterable`\<`Uint8Array`\<`ArrayBufferLike`\>\>

Stream owned by the caller; iterator cancellation propagates upstream.

### maxEventBytes?

`number` = `65_536`

Per-event memory bound in UTF-8 bytes, default 65536.

## Returns

`AsyncIterable`\<[`IRemoteServerEvent`](../interfaces/IRemoteServerEvent.md)\>

Events only after their terminating empty line; no replay or JSON policy is inferred.

## Throws

Error when a retained line or event exceeds the bound or UTF-8 is malformed.
