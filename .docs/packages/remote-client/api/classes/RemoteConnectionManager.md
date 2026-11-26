# Class: RemoteConnectionManager

Serializes durable safe-profile selection and owns one active session.

## Remarks

Persistence commits before the visible profile set changes. Credentials use a separate privileged port.

## Constructors

### Constructor

> **new RemoteConnectionManager**(`_options`): `RemoteConnectionManager`

Compose product-scoped profile persistence and session creation.

#### Parameters

##### \_options

[`IRemoteConnectionManagerOptions`](../interfaces/IRemoteConnectionManagerOptions.md)

Application namespace, store and connector-aware session factory.

#### Returns

`RemoteConnectionManager`

## Accessors

### activeConnectionId

#### Get Signature

> **get** **activeConnectionId**(): `string` \| `undefined`

Identifier associated with the active session.

##### Returns

`string` \| `undefined`

***

### activeSession

#### Get Signature

> **get** **activeSession**(): [`RemoteSession`](RemoteSession.md) \| `undefined`

Session currently owned by this manager, when selected.

##### Returns

[`RemoteSession`](RemoteSession.md) \| `undefined`

***

### profiles

#### Get Signature

> **get** **profiles**(): readonly [`IRemoteSavedConnection`](../interfaces/IRemoteSavedConnection.md)[]

Validated immutable credential-free profiles loaded by initialize.

##### Returns

readonly [`IRemoteSavedConnection`](../interfaces/IRemoteSavedConnection.md)[]

## Methods

### activate()

> **activate**(`connectionId`): `Promise`\<[`RemoteSession`](RemoteSession.md)\>

Close the previous session and restore one saved connection.

#### Parameters

##### connectionId

`string`

Identifier selected from profiles.

#### Returns

`Promise`\<[`RemoteSession`](RemoteSession.md)\>

The newly owned session after initialization.

#### Throws

Error when the selected profile does not exist.

***

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Cancel the selected view without deleting a profile or host grant.

#### Returns

`Promise`\<`void`\>

Session cleanup completion.

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Close the active session and permanently dispose this manager.

#### Returns

`Promise`\<`void`\>

Idempotent cleanup completion.

***

### forget()

> **forget**(`connectionId`): `Promise`\<`void`\>

Forget one profile and its optional privileged credential.

#### Parameters

##### connectionId

`string`

Stored identifier; absent identifiers are a no-op.

#### Returns

`Promise`\<`void`\>

Durable metadata update and owned session cleanup completion.

***

### initialize()

> **initialize**(): `Promise`\<`void`\>

Load and validate the product's existing profile metadata.

#### Returns

`Promise`\<`void`\>

Completion after all identities and endpoint selections are checked.

#### Throws

Error for duplicate identifiers, another app namespace or malformed profiles.

***

### save()

> **save**(`profile`): `Promise`\<`void`\>

Atomically persist one safe profile, replacing its previous record.

#### Parameters

##### profile

[`IRemoteSavedConnection`](../interfaces/IRemoteSavedConnection.md)

Metadata with no bearer credential or pairing challenge.

#### Returns

`Promise`\<`void`\>

Durable save completion; a selected old version is disposed afterwards.
