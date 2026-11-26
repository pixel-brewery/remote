# Type Alias: RemoteAccessEvent

> **RemoteAccessEvent** = \{ `deviceId`: `string`; `kind`: `"revoked"`; \} \| \{ `kind`: `"disabled"`; \} \| \{ `kind`: `"pairings-invalidated"`; \}

Authorization changes which require transports to terminate owned channels.

## Union Members

### Type Literal

\{ `deviceId`: `string`; `kind`: `"revoked"`; \}

#### deviceId

> `readonly` **deviceId**: `string`

Opaque identifier of one durably paired device.

#### kind

> `readonly` **kind**: `"revoked"`

Committed authorization or invitation-lifecycle transition that the observing transport must apply.

***

### Type Literal

\{ `kind`: `"disabled"`; \}

#### kind

> `readonly` **kind**: `"disabled"`

Committed authorization or invitation-lifecycle transition that the observing transport must apply.

***

### Type Literal

\{ `kind`: `"pairings-invalidated"`; \}

#### kind

> `readonly` **kind**: `"pairings-invalidated"`

Committed authorization or invitation-lifecycle transition that the observing transport must apply.
