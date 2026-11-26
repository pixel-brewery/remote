# Type Alias: RemoteAccessEvent

> **RemoteAccessEvent** = \{ `deviceId`: `string`; `kind`: `"revoked"`; \} \| \{ `kind`: `"disabled"`; \} \| \{ `kind`: `"pairings-invalidated"`; \} \| \{ `deviceId`: `string`; `kind`: `"paired"`; \}

Committed authorization changes delivered synchronously to access observers.

## Union Members

### Type Literal

\{ `deviceId`: `string`; `kind`: `"revoked"`; \}

#### deviceId

> `readonly` **deviceId**: `string`

Opaque identifier of one durably paired device.

#### kind

> `readonly` **kind**: `"revoked"`

A durable device grant was removed; that device's open work must be canceled.

***

### Type Literal

\{ `kind`: `"disabled"`; \}

#### kind

> `readonly` **kind**: `"disabled"`

Disabled intent was committed; every device-owned channel must be canceled.

***

### Type Literal

\{ `kind`: `"pairings-invalidated"`; \}

#### kind

> `readonly` **kind**: `"pairings-invalidated"`

Every outstanding pairing invitation was invalidated after a stop, rebind or explicit call.

***

### Type Literal

\{ `deviceId`: `string`; `kind`: `"paired"`; \}

#### deviceId

> `readonly` **deviceId**: `string`

Opaque identifier of the newly paired device, matching the sanitized status projection.

#### kind

> `readonly` **kind**: `"paired"`

A new device grant was durably stored, either by QR possession or by host approval.

## Remarks

Every event follows its durable or lifecycle commit. Transports must terminate
owned channels on `revoked` and `disabled`; `pairings-invalidated` ends every
outstanding invitation. `paired` lets local administration react to a newly
stored device grant, for example by closing a displayed invitation. No event
carries a credential, challenge or token digest. Observers that switch on the
kind must tolerate kinds they do not handle.
