# Interface: IRemoteCapacitorBridge

In-app native connection controls plus the platform QR scanner.

## Extends

- `IRemoteControlBridge`

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

#### Inherited from

`IRemoteControlBridge.closeConnection`

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

#### Inherited from

`IRemoteControlBridge.forgetConnection`

***

### listConnections()

> **listConnections**(): `Promise`\<readonly `Readonly`\<\{ `endpoints`: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]; `id`: `string`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `label`: `string`; `selectedEndpointId`: `string`; \}\>[]\>

Read safe connection metadata.

#### Returns

`Promise`\<readonly `Readonly`\<\{ `endpoints`: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]; `id`: `string`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `label`: `string`; `selectedEndpointId`: `string`; \}\>[]\>

Credential-free saved connection metadata.

#### Inherited from

`IRemoteControlBridge.listConnections`

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

#### Inherited from

`IRemoteControlBridge.openConnection`

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

#### Inherited from

`IRemoteControlBridge.pair`

***

### scanPairing()

> **scanPairing**(): `Promise`\<`Readonly`\<\{ `appId`: `string`; `challenge`: `string`; `expiresAt`: `string`; `hostId`: `string`; `origin`: `string`; \}\>\>

Scan a host invitation after the operating system grants camera access.

#### Returns

`Promise`\<`Readonly`\<\{ `appId`: `string`; `challenge`: `string`; `expiresAt`: `string`; `hostId`: `string`; `origin`: `string`; \}\>\>

Validated invitation material after the operating system grants camera access.
