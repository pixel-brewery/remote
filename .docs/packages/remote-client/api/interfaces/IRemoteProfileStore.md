# Interface: IRemoteProfileStore

Host-owned profile metadata storage.

## Methods

### load()

> **load**(): `Promise`\<readonly [`IRemoteSavedConnection`](IRemoteSavedConnection.md)[]\>

Read all safe profiles for this application namespace.

#### Returns

`Promise`\<readonly [`IRemoteSavedConnection`](IRemoteSavedConnection.md)[]\>

Safe profiles belonging to the current product namespace.

***

### save()

> **save**(`profiles`): `Promise`\<`void`\>

Atomically replace the profile set.

#### Parameters

##### profiles

readonly [`IRemoteSavedConnection`](IRemoteSavedConnection.md)[]

Complete credential-free profile snapshot for atomic persistence.

#### Returns

`Promise`\<`void`\>

Atomic complete-profile replacement completion.
