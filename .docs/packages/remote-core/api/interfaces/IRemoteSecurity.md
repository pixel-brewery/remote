# Interface: IRemoteSecurity

Host cryptographic primitives. Digests and random credentials never become product state.

## Methods

### equalDigest()

> **equalDigest**(`left`, `right`): `boolean`

Compares valid fixed-format digests without content-dependent early exit.

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

***

### hashToken()

> **hashToken**(`value`): `string`

Produces a deterministic digest for lookup or persistence without retaining plaintext.

#### Parameters

##### value

`string`

Input value interpreted by this operation; returned persistence values are detached copies.

#### Returns

`string`

The deterministic token digest.

***

### randomToken()

> **randomToken**(`bytes?`): `string`

Creates an unpredictable base64url credential using the requested entropy budget.

#### Parameters

##### bytes?

`number`

Entropy bytes to encode. Defaults to 32; the Node implementation accepts integers from 16 through 64.

#### Returns

`string`

An unpredictable URL-safe credential.
