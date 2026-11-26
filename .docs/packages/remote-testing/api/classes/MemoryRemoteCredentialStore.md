# Class: MemoryRemoteCredentialStore

Test-only credential namespace; production apps supply an OS-protected store.

## Implements

- `IRemoteCredentialStore`

## Constructors

### Constructor

> **new MemoryRemoteCredentialStore**(): `MemoryRemoteCredentialStore`

#### Returns

`MemoryRemoteCredentialStore`

## Methods

### delete()

> **delete**(`identity`): `Promise`\<`void`\>

Removes exactly one app/host secret.

#### Parameters

##### identity

`IRemoteHostIdentity`

Exact application and installation namespace to address in protected storage.

#### Returns

`Promise`\<`void`\>

Resolves after local removal; unrelated hosts are preserved.

#### Implementation of

`IRemoteCredentialStore.delete`

***

### get()

> **get**(`identity`): `Promise`\<`string` \| `null`\>

Reads exactly one app/host secret.

#### Parameters

##### identity

`IRemoteHostIdentity`

Exact application and installation namespace to address in protected storage.

#### Returns

`Promise`\<`string` \| `null`\>

The credential in exactly this app/host namespace, or null when absent.

#### Implementation of

`IRemoteCredentialStore.get`

***

### set()

> **set**(`identity`, `credential`): `Promise`\<`void`\>

Replaces exactly one app/host secret.

#### Parameters

##### identity

`IRemoteHostIdentity`

Exact application and installation namespace to address in protected storage.

##### credential

`string`

Plaintext device bearer confined to the privileged runtime. Never project or log it.

#### Returns

`Promise`\<`void`\>

Resolves after the credential is protected in exactly this app/host namespace.

#### Implementation of

`IRemoteCredentialStore.set`
