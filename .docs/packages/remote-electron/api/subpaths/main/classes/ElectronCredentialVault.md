# Class: ElectronCredentialVault

Main-owned OS-encrypted atomic credential records, namespaced by app and host.

## Remarks

Construct only after Electron app readiness. basic_text is rejected; no plaintext fallback exists.

## Implements

- `IRemoteCredentialStore`

## Constructors

### Constructor

> **new ElectronCredentialVault**(`_path`, `_safeStorage`): `ElectronCredentialVault`

Compose the private record path and Electron Main safeStorage capability.

#### Parameters

##### \_path

`string`

Absolute application-private credential file path.

##### \_safeStorage

[`IElectronSafeStorage`](../interfaces/IElectronSafeStorage.md)

OS-backed encryption API, kept outside Utility and renderer.

#### Returns

`ElectronCredentialVault`

#### Throws

Error for relative paths or unavailable/insecure storage backends.

## Methods

### delete()

> **delete**(`identity`): `Promise`\<`void`\>

Remove one local credential while preserving all other installations.

#### Parameters

##### identity

`IRemoteHostIdentity`

Exact namespace to remove.

#### Returns

`Promise`\<`void`\>

Atomic update completion.

#### Implementation of

`IRemoteCredentialStore.delete`

***

### get()

> **get**(`identity`): `Promise`\<`string` \| `null`\>

Decrypt only the selected application's installation credential.

#### Parameters

##### identity

`IRemoteHostIdentity`

Exact product and host namespace.

#### Returns

`Promise`\<`string` \| `null`\>

Credential, or null when that namespace is absent.

#### Throws

Error for malformed records or unavailable OS encryption.

#### Implementation of

`IRemoteCredentialStore.get`

***

### set()

> **set**(`identity`, `credential`): `Promise`\<`void`\>

Encrypt and atomically replace one installation's credential.

#### Parameters

##### identity

`IRemoteHostIdentity`

Product and host namespace established before credential dispatch.

##### credential

`string`

Opaque server-issued secret, bounded to 256 characters.

#### Returns

`Promise`\<`void`\>

Durable encrypted-file replacement completion.

#### Implementation of

`IRemoteCredentialStore.set`
