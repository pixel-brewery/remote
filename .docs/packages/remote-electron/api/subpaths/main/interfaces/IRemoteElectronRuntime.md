# Interface: IRemoteElectronRuntime

Narrow application-supplied Utility proxy consumed by Main IPC routing.

## Remarks

This port contains no process object, arbitrary request method or credential retrieval API.

## Methods

### closeConnection()

> **closeConnection**(`connectionId`): `Promise`\<`void`\>

Cancel the selected view without forgetting its grant.

#### Parameters

##### connectionId

`string`

Active profile identifier; other identifiers leave it running.

#### Returns

`Promise`\<`void`\>

Owned stream cancellation completion.

***

### forgetConnection()

> **forgetConnection**(`connectionId`): `Promise`\<`void`\>

Remove one local profile and protected credential.

#### Parameters

##### connectionId

`string`

Exact saved-profile identifier to forget.

#### Returns

`Promise`\<`void`\>

Durable removal completion after owned stream cancellation.

***

### listConnections()

> **listConnections**(): `Promise`\<readonly `Readonly`\<\{ `endpoints`: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]; `id`: `string`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `label`: `string`; `selectedEndpointId`: `string`; \}\>[]\>

Read safe profile metadata.

#### Returns

`Promise`\<readonly `Readonly`\<\{ `endpoints`: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]; `id`: `string`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `label`: `string`; `selectedEndpointId`: `string`; \}\>[]\>

Product-scoped saved profiles without credentials.

***

### openConnection()

> **openConnection**(`connectionId`): `Promise`\<[`IRemoteElectronActivation`](IRemoteElectronActivation.md)\>

Restore one saved device grant and open its protected local gateway.

#### Parameters

##### connectionId

`string`

Exact saved-profile identifier.

#### Returns

`Promise`\<[`IRemoteElectronActivation`](IRemoteElectronActivation.md)\>

Main-only local-view activation.

***

### pair()

> **pair**(`bootstrap`, `deviceName`): `Promise`\<[`IRemoteElectronActivation`](IRemoteElectronActivation.md)\>

Pair and protect a device grant in the privileged runtime.

#### Parameters

##### bootstrap

`IRemotePairingBootstrap`

Short-lived invitation for the immutable product namespace.

##### deviceName

`string`

Stable user-selected label for this attempt.

#### Returns

`Promise`\<[`IRemoteElectronActivation`](IRemoteElectronActivation.md)\>

Main-only cookie activation after durable native credential storage.
