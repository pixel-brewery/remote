# Interface: IRemoteAccessDependencies

Explicit application composition for a product-neutral authorization owner.

## Properties

### capabilities

> `readonly` **capabilities**: readonly `string`[]

Exact operation capabilities granted by the application; resource-level checks remain application-owned.

***

### clock

> `readonly` **clock**: [`IRemoteClock`](IRemoteClock.md)

Injected UTC instant source used for challenge expiration.

***

### identity

> `readonly` **identity**: `IRemoteHostIdentity`

Application and installation namespace to which this owner belongs.

***

### maxDevices?

> `readonly` `optional` **maxDevices?**: `number`

Maximum durable device grants, default and maximum 100.

***

### maxPendingPairings?

> `readonly` `optional` **maxPendingPairings?**: `number`

Maximum retained invitation records, default 32 and at most 128.

***

### pairingLifetimeMs?

> `readonly` `optional` **pairingLifetimeMs?**: `number`

Invitation lifetime in milliseconds; defaults to five minutes and cannot exceed fifteen minutes.

***

### pairingPolicy?

> `readonly` `optional` **pairingPolicy?**: `"qr-possession"` \| `"host-approval"`

QR possession authorizes by default. Set host-approval to require an additional explicit local approval.

***

### security

> `readonly` **security**: [`IRemoteSecurity`](IRemoteSecurity.md)

Injected entropy, hashing and constant-time digest comparison operations.

***

### store

> `readonly` **store**: [`IRemoteAccessStore`](IRemoteAccessStore.md)

Application-owned atomic persistence port with one active writer per installation.
