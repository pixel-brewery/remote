# Class: RemoteClientError

Stable client failure classification without transport-specific exceptions or credentials.

## Remarks

A lost mutation is OUTCOME_UNKNOWN and must be reconciled before a user retries it.

## Extends

- `Error`

## Constructors

### Constructor

> **new RemoteClientError**(`code`, `message`): `RemoteClientError`

Create an actionable credential-free failure.

#### Parameters

##### code

`"CONNECTION_CLOSED"` \| `"HOST_MISMATCH"` \| `"UNSUPPORTED_PROTOCOL"` \| `"SESSION_REQUIRED"` \| `"OUTCOME_UNKNOWN"` \| `"TRANSPORT_FAILED"` \| `"INVALID_BOOTSTRAP"`

Machine-readable lifecycle or transport classification.

##### message

`string`

Safe explanation suitable for the owning application.

#### Returns

`RemoteClientError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"CONNECTION_CLOSED"` \| `"HOST_MISMATCH"` \| `"UNSUPPORTED_PROTOCOL"` \| `"SESSION_REQUIRED"` \| `"OUTCOME_UNKNOWN"` \| `"TRANSPORT_FAILED"` \| `"INVALID_BOOTSTRAP"`

Machine-readable lifecycle or transport classification.
