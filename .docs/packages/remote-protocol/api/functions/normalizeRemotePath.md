# Function: normalizeRemotePath()

> **normalizeRemotePath**(`input`): `string`

Validates an origin-form path without resolving ambiguous path segments.

## Parameters

### input

`string`

Original request path, optionally followed by a query.

## Returns

`string`

A decoded pathname whose segments were validated exactly once.

## Throws

RemoteProtocolError when normalization could change routing authority.
