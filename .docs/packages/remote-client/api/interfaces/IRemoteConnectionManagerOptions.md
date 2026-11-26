# Interface: IRemoteConnectionManagerOptions

Host-provided composition for local connection management.

## Properties

### appId

> `readonly` **appId**: `string`

Product namespace accepted by this client instance.

***

### createSession

> `readonly` **createSession**: (`profile`) => [`RemoteSession`](../classes/RemoteSession.md)

Create a session with the runtime's selected connector and credential policy.

#### Parameters

##### profile

[`IRemoteSavedConnection`](IRemoteSavedConnection.md)

#### Returns

[`RemoteSession`](../classes/RemoteSession.md)

***

### forgetCredential?

> `readonly` `optional` **forgetCredential?**: (`identity`) => `Promise`\<`void`\>

Optional privileged removal of the corresponding local credential.

#### Parameters

##### identity

`IRemoteHostIdentity`

#### Returns

`Promise`\<`void`\>

***

### store

> `readonly` **store**: [`IRemoteProfileStore`](IRemoteProfileStore.md)

Safe profile persistence, separate from credentials.
