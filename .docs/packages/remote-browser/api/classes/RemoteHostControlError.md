# Class: RemoteHostControlError

Credential-free classification of a failed local host-control command.

## Remarks

A failed mutating command may still have persisted its intent before failing, for example an
activation that could not bind a network interface yet. Read the status again instead of assuming no effect.

## Extends

- `Error`

## Constructors

### Constructor

> **new RemoteHostControlError**(`code`, `message`, `status?`, `remoteCode?`): `RemoteHostControlError`

Create a failure without server messages, invitation material or credentials.

#### Parameters

##### code

`"network"` \| `"timeout"` \| `"rejected"` \| `"disposed"` \| `"invalid-request"` \| `"unavailable"` \| `"invalid-response"` \| `"response-too-large"` \| `"invalid-invitation"`

Failure class used by the owning view to choose its recovery.

##### message

`string`

Safe explanation suitable for logs and diagnostics.

##### status?

`number`

HTTP status of a rejected command.

##### remoteCode?

`"network"` \| `"expired"` \| `"consumed"` \| `"disposed"` \| `"forbidden"` \| `"incompatible"` \| `"invalid-request"` \| `"not-ready"` \| `"persistence"` \| `"resource-limit"` \| `"unauthorized"` \| `"unknown-outcome"`

Canonical protocol error code read from a rejected command's bounded error body.

#### Returns

`RemoteHostControlError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"network"` \| `"timeout"` \| `"rejected"` \| `"disposed"` \| `"invalid-request"` \| `"unavailable"` \| `"invalid-response"` \| `"response-too-large"` \| `"invalid-invitation"`

Failure class: `unavailable` (guard denied, nothing sent), `disposed`, `invalid-request` (rejected argument,
nothing sent), `timeout`, `network`, `rejected` (non-2xx answer), `invalid-response` (non-JSON, malformed or
schema-invalid body), `response-too-large` or `invalid-invitation` (bootstrap foreign to the status or expired).

***

### remoteCode

> `readonly` **remoteCode**: `"network"` \| `"expired"` \| `"consumed"` \| `"disposed"` \| `"forbidden"` \| `"incompatible"` \| `"invalid-request"` \| `"not-ready"` \| `"persistence"` \| `"resource-limit"` \| `"unauthorized"` \| `"unknown-outcome"` \| `undefined`

Canonical protocol error code when a rejection carried a canonical error body; otherwise undefined.

***

### status

> `readonly` **status**: `number` \| `undefined`

HTTP status of a `rejected` command; undefined for every other failure class.
