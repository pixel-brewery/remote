# Class: NodeRemoteSecurity

Node cryptographic defaults with no import-time I/O.

## Implements

- `IRemoteSecurity`

## Constructors

### Constructor

> **new NodeRemoteSecurity**(): `NodeRemoteSecurity`

#### Returns

`NodeRemoteSecurity`

## Methods

### equalDigest()

> **equalDigest**(`left`, `right`): `boolean`

Compares validated digests without content-dependent early exit.

#### Parameters

##### left

`string`

First validated digest to compare.

##### right

`string`

Second validated digest to compare.

#### Returns

`boolean`

True only when both valid digests contain the same bytes.

#### Implementation of

`IRemoteSecurity.equalDigest`

***

### hashToken()

> **hashToken**(`value`): `string`

Produces the persisted SHA-256 digest; raw tokens are never stored.

#### Parameters

##### value

`string`

Plaintext UTF-8 token to digest with SHA-256.

#### Returns

`string`

The deterministic token digest.

#### Implementation of

`IRemoteSecurity.hashToken`

***

### randomToken()

> **randomToken**(`bytes?`): `string`

Creates a base64url bearer from operating-system entropy.

#### Parameters

##### bytes?

`number` = `32`

Entropy bytes to encode. Defaults to 32; the Node implementation accepts integers from 16 through 64.

#### Returns

`string`

An unpredictable URL-safe credential.

#### Throws

RangeError when entropy is outside the integer range 16 through 64 bytes.

#### Implementation of

`IRemoteSecurity.randomToken`
