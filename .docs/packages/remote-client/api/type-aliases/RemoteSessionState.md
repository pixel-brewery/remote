# Type Alias: RemoteSessionState

> **RemoteSessionState** = \{ `kind`: `"idle"` \| `"connecting"` \| `"revoked"` \| `"disposed"`; \} \| \{ `host`: `IRemoteHostDescriptor`; `kind`: `"pairing-required"` \| `"pairing"`; \} \| \{ `expiresAt`: `string`; `host`: `IRemoteHostDescriptor`; `kind`: `"pending-approval"`; \} \| \{ `kind`: `"ready"`; `session`: `IRemoteSessionDescriptor`; \} \| \{ `attempt`: `number`; `kind`: `"reconnecting"`; `retryAt`: `number`; \} \| \{ `kind`: `"offline"`; `reason`: `"network"` \| `"retry-exhausted"`; \} \| \{ `kind`: `"incompatible"`; `reason`: `"identity"` \| `"protocol"`; \}

Credential-free lifecycle snapshots for a single selected host.

## Union Members

### Type Literal

\{ `kind`: `"idle"` \| `"connecting"` \| `"revoked"` \| `"disposed"`; \}

#### kind

> `readonly` **kind**: `"idle"` \| `"connecting"` \| `"revoked"` \| `"disposed"`

Inactive, connecting or terminal lifecycle discriminator.

***

### Type Literal

\{ `host`: `IRemoteHostDescriptor`; `kind`: `"pairing-required"` \| `"pairing"`; \}

#### host

> `readonly` **host**: `IRemoteHostDescriptor`

Verified public host descriptor with no device credential.

#### kind

> `readonly` **kind**: `"pairing-required"` \| `"pairing"`

Pairing is required or its request is currently executing.

***

### Type Literal

\{ `expiresAt`: `string`; `host`: `IRemoteHostDescriptor`; `kind`: `"pending-approval"`; \}

#### expiresAt

> `readonly` **expiresAt**: `string`

ISO timestamp after which the pending attempt can no longer complete.

#### host

> `readonly` **host**: `IRemoteHostDescriptor`

Verified host awaiting approval.

#### kind

> `readonly` **kind**: `"pending-approval"`

The host requires explicit approval of this existing pairing attempt.

***

### Type Literal

\{ `kind`: `"ready"`; `session`: `IRemoteSessionDescriptor`; \}

#### kind

> `readonly` **kind**: `"ready"`

Authentication succeeded and admitted domain operations may run.

#### session

> `readonly` **session**: `IRemoteSessionDescriptor`

Scoped principal and host metadata; no bearer or pairing challenge is included.

***

### Type Literal

\{ `attempt`: `number`; `kind`: `"reconnecting"`; `retryAt`: `number`; \}

#### attempt

> `readonly` **attempt**: `number`

One-based restore attempt number within the configured retry budget.

#### kind

> `readonly` **kind**: `"reconnecting"`

A bounded authentication-restore retry is scheduled.

#### retryAt

> `readonly` **retryAt**: `number`

Unix time in milliseconds when the next restore may begin.

***

### Type Literal

\{ `kind`: `"offline"`; `reason`: `"network"` \| `"retry-exhausted"`; \}

#### kind

> `readonly` **kind**: `"offline"`

The connection is offline and may need an explicit user retry.

#### reason

> `readonly` **reason**: `"network"` \| `"retry-exhausted"`

Whether connectivity failed or the automatic retry budget was exhausted.

***

### Type Literal

\{ `kind`: `"incompatible"`; `reason`: `"identity"` \| `"protocol"`; \}

#### kind

> `readonly` **kind**: `"incompatible"`

Public host validation rejected this endpoint before authentication restore.

#### reason

> `readonly` **reason**: `"identity"` \| `"protocol"`

Identity mismatch or unsupported protocol version requiring another host selection.

## Remarks

Product requests and domain state never determine whether pairing succeeded.
