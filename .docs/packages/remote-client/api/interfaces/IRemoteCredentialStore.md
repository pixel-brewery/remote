# Interface: IRemoteCredentialStore

Privileged credential port. Applications choose the protected storage namespace.

## Methods

### delete()

> **delete**(`identity`): `Promise`\<`void`\>

Forget a local credential without changing unrelated hosts.

#### Parameters

##### identity

`IRemoteHostIdentity`

Exact product and installation namespace.

#### Returns

`Promise`\<`void`\>

Completion after removing only the selected local credential.

***

### get()

> **get**(`identity`): `Promise`\<`string` \| `null`\>

Read the credential belonging to this app and host only.

#### Parameters

##### identity

`IRemoteHostIdentity`

Exact product and installation namespace.

#### Returns

`Promise`\<`string` \| `null`\>

Protected credential, or null when that namespace has none.

***

### set()

> **set**(`identity`, `credential`): `Promise`\<`void`\>

Atomically protect the issued credential before reporting native pairing success.

#### Parameters

##### identity

`IRemoteHostIdentity`

Exact product and installation namespace.

##### credential

`string`

Opaque server-issued secret; never expose it to view code.

#### Returns

`Promise`\<`void`\>

Durable protected-storage completion.
