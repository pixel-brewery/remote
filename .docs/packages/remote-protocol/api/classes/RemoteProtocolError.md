# Class: RemoteProtocolError

A controlled protocol failure safe to project across a trust boundary.

## Extends

- `Error`

## Constructors

### Constructor

> **new RemoteProtocolError**(`code`, `message`): `RemoteProtocolError`

Creates a safe failure without serializing an internal cause.

#### Parameters

##### code

`"network"` \| `"expired"` \| `"invalid-request"` \| `"unauthorized"` \| `"forbidden"` \| `"consumed"` \| `"not-ready"` \| `"incompatible"` \| `"resource-limit"` \| `"persistence"` \| `"disposed"` \| `"unknown-outcome"`

Stable protocol failure category.

##### message

`string`

Safe public explanation without internal causes, credentials or private payloads.

#### Returns

`RemoteProtocolError`

#### Overrides

`Error.constructor`

## Properties

### code

> `readonly` **code**: `"network"` \| `"expired"` \| `"invalid-request"` \| `"unauthorized"` \| `"forbidden"` \| `"consumed"` \| `"not-ready"` \| `"incompatible"` \| `"resource-limit"` \| `"persistence"` \| `"disposed"` \| `"unknown-outcome"`

Stable failure code.
