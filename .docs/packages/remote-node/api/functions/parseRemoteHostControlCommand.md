# Function: parseRemoteHostControlCommand()

> **parseRemoteHostControlCommand**(`path`, `body`): [`RemoteHostControlCommand`](../type-aliases/RemoteHostControlCommand.md)

Validates the complete JSON body of one private host-control command.

## Parameters

### path

`string`

Exact command path below the control prefix, such as `/enable`.

### body

`unknown`

Parsed JSON value of the bounded request body.

## Returns

[`RemoteHostControlCommand`](../type-aliases/RemoteHostControlCommand.md)

One known command containing only explicitly selected fields.

## Remarks

`/enable`, `/disable` and `/reconcile` accept exactly `{}`; `/pair` accepts
`{}` or `{ "endpointId": string }`; `/revoke` requires exactly
`{ "deviceId": string }`. Unknown fields, arrays, other paths and malformed
identifiers fail. The caller must establish local authority before parsing.
Parsing starts no listener, saves no state and creates no invitation.

## Throws

RemoteProtocolError with `invalid-request` for an unsupported path, shape or identifier.
