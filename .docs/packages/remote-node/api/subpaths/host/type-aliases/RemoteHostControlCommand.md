# Type Alias: RemoteHostControlCommand

> **RemoteHostControlCommand** = \{ `kind`: `"enable"`; \} \| \{ `kind`: `"disable"`; \} \| \{ `kind`: `"reconcile"`; \} \| \{ `endpointId?`: `string`; `kind`: `"pair"`; \} \| \{ `deviceId`: `string`; `kind`: `"revoke"`; \}

Closed private host-control command set; there is no arbitrary remote procedure call.

## Union Members

### Type Literal

\{ `kind`: `"enable"`; \}

#### kind

> `readonly` **kind**: `"enable"`

Persists explicit remote activation and starts the listener.

***

### Type Literal

\{ `kind`: `"disable"`; \}

#### kind

> `readonly` **kind**: `"disable"`

Closes access and durably stores disabled intent.

***

### Type Literal

\{ `kind`: `"reconcile"`; \}

#### kind

> `readonly` **kind**: `"reconcile"`

Rechecks the private network interface after a network change or resume.

***

### Type Literal

\{ `endpointId?`: `string`; `kind`: `"pair"`; \}

#### endpointId?

> `readonly` `optional` **endpointId?**: `string`

Optional advertised endpoint identifier; omission selects the first available endpoint.

#### kind

> `readonly` **kind**: `"pair"`

Creates a short-lived out-of-band pairing invitation.

***

### Type Literal

\{ `deviceId`: `string`; `kind`: `"revoke"`; \}

#### deviceId

> `readonly` **deviceId**: `string`

Exact opaque device identifier selected from the local status projection.

#### kind

> `readonly` **kind**: `"revoke"`

Removes one durable device grant.

## Remarks

Commands are parsed only after the application's local authority check.
They carry no credentials, grant records or executable callbacks.
