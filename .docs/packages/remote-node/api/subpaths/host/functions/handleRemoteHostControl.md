# Function: handleRemoteHostControl()

> **handleRemoteHostControl**(`request`, `response`, `control`, `options?`): `Promise`\<`void`\>

Serves the closed private host-control HTTP endpoint on Node request and response objects.

## Parameters

### request

`IncomingMessage`

Locally authorized request with an unconsumed body.

### response

`ServerResponse`

Response owned by this handler until it resolves.

### control

[`IRemoteHostControl`](../interfaces/IRemoteHostControl.md) \| `undefined`

Host control, or undefined while the host is not yet available (503).

### options?

[`IRemoteHostControlOptions`](../interfaces/IRemoteHostControlOptions.md) = `{}`

Optional prefix (default `/__host/remote/v1`) and body limit (default 2048 bytes).

## Returns

`Promise`\<`void`\>

Resolves after the command completed and its response was submitted.

## Remarks

The caller remains responsible for local authorization: invoke this handler
only for requests already proven to come from the application's own local
administration surface, never for device requests admitted by the remote host.
Route every request whose path equals or begins with the prefix here and pass
the original, unconsumed request whose `url` is the complete origin-form target.

`GET <prefix>/status` returns the status. `POST <prefix>/enable`, `/disable`,
`/reconcile` and `/revoke` run their command and return the resulting status;
`POST <prefix>/pair` returns the secret-bearing invitation, which must only be
shown locally. Write bodies are strict JSON (`{}`, `{ "endpointId"?: string }`,
`{ "deviceId": string }`), parsed by [parseRemoteHostControlCommand](parseRemoteHostControlCommand.md).
Queries, trailing slashes and unknown paths yield 404; a wrong method yields
405 with `Allow`; non-JSON or invalid bodies yield 422; a declared or streamed
body above the limit yields 413 and closes the connection; `forbidden` yields
403; a missing control, full command queue or unavailable host yields 503.
Every response is `no-store`; JSON responses use `application/json`, and
error bodies carry only `{ error: { code, message } }`.

## Throws

RemoteProtocolError with `invalid-request` for an invalid prefix or body limit; command, validation
and host failures are written as HTTP errors instead. A response that can no longer carry an error is destroyed.
