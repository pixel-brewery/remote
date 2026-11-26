# Type Alias: IRemotePairingGrant

> **IRemotePairingGrant** = \{ `expiresAt`: `string`; `pairingId`: `string`; `status`: `"pending"`; \} \| \{ `credential`: `string`; `expiresAt`: `string`; `pairingId`: `string`; `principal`: `IRemotePrincipal`; `status`: `"paired"`; \}

Ephemeral privileged pairing result; Node adapters project its credential appropriately.

## Union Members

### Type Literal

\{ `expiresAt`: `string`; `pairingId`: `string`; `status`: `"pending"`; \}

#### expiresAt

> `readonly` **expiresAt**: `string`

Exclusive expiration instant in UTC ISO 8601 format.

#### pairingId

> `readonly` **pairingId**: `string`

Opaque identifier used by local host administration to approve or reject this attempt.

#### status

> `readonly` **status**: `"pending"`

Discriminator identifying whether host approval is pending or a device grant is available.

***

### Type Literal

\{ `credential`: `string`; `expiresAt`: `string`; `pairingId`: `string`; `principal`: `IRemotePrincipal`; `status`: `"paired"`; \}

#### credential

> `readonly` **credential**: `string`

Ephemeral plaintext bearer for privileged runtime consumption. Persist only its protected client value or host digest.

#### expiresAt

> `readonly` **expiresAt**: `string`

Exclusive expiration instant in UTC ISO 8601 format.

#### pairingId

> `readonly` **pairingId**: `string`

Opaque identifier used by local host administration to approve or reject this attempt.

#### principal

> `readonly` **principal**: `IRemotePrincipal`

Authenticated device identity and its granted capabilities.

#### status

> `readonly` **status**: `"paired"`

Discriminator identifying whether host approval is pending or a device grant is available.
