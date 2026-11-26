# Interface: IRemoteControlBridge

Closed client-view control surface. It exposes neither IPC invoke nor transport credentials.

## Methods

### closeConnection()

> **closeConnection**(`connectionId`): `Promise`\<`void`\>

Close its local view and owned streams.

#### Parameters

##### connectionId

`string`

Exact saved connection identifier.

#### Returns

`Promise`\<`void`\>

Completion after cancellation of that connection’s view and streams.

***

### forgetConnection()

> **forgetConnection**(`connectionId`): `Promise`\<`void`\>

Forget local profile and credential.

#### Parameters

##### connectionId

`string`

Exact saved connection identifier.

#### Returns

`Promise`\<`void`\>

Completion after deleting its profile and local credential.

***

### listConnections()

> **listConnections**(): `Promise`\<readonly `Readonly`\<\{ `endpoints`: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]; `id`: `string`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `label`: `string`; `selectedEndpointId`: `string`; \}\>[]\>

Read safe connection metadata.

#### Returns

`Promise`\<readonly `Readonly`\<\{ `endpoints`: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]; `id`: `string`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `label`: `string`; `selectedEndpointId`: `string`; \}\>[]\>

Credential-free saved connection metadata.

***

### openConnection()

> **openConnection**(`connectionId`): `Promise`\<`Readonly`\<\{ `connectionId`: `string`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `origin`: `string`; \}\>\>

Open one saved connection inside the application.

#### Parameters

##### connectionId

`string`

Exact saved connection identifier.

#### Returns

`Promise`\<`Readonly`\<\{ `connectionId`: `string`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `origin`: `string`; \}\>\>

Safe local-view descriptor after privileged activation.

***

### pair()

> **pair**(`bootstrap`, `deviceName`): `Promise`\<`Readonly`\<\{ `connectionId`: `string`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `origin`: `string`; \}\>\>

Pair the selected host with a copied or scanned invitation.

#### Parameters

##### bootstrap

`IRemotePairingBootstrap`

Validated short-lived invitation matching the selected host.

##### deviceName

`string`

User-selected device label, trimmed before validation.

#### Returns

`Promise`\<`Readonly`\<\{ `connectionId`: `string`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `origin`: `string`; \}\>\>

Safe local-view descriptor after privileged activation; pending approval must resume the same invitation.
