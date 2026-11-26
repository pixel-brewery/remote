# Interface: IRemoteHostControl

Closed set of local host-administration commands exposed to the owning application.

## Remarks

The application establishes local authority before invoking any member; device
requests never reach this surface. Commands resolve only after their durable
persistence and resource work completes. Reading status never creates a
pairing secret.

## Extended by

- [`IRemoteHostLifecycle`](IRemoteHostLifecycle.md)

## Methods

### createPairing()

> **createPairing**(`endpointId?`): `Promise`\<`Readonly`\<\{ `appId`: `string`; `challenge`: `string`; `expiresAt`: `string`; `hostId`: `string`; `origin`: `string`; \}\>\>

Creates one out-of-band pairing invitation for an available endpoint.

#### Parameters

##### endpointId?

`string`

Optional advertised endpoint identifier; omission selects the first available endpoint.

#### Returns

`Promise`\<`Readonly`\<\{ `appId`: `string`; `challenge`: `string`; `expiresAt`: `string`; `hostId`: `string`; `origin`: `string`; \}\>\>

Secret-bearing invitation for local display only; never log or persist it.

#### Throws

RemoteProtocolError when remote access or the requested endpoint is unavailable.

***

### disable()

> **disable**(): `Promise`\<`void`\>

Closes remote work and durably records disabled intent.

#### Returns

`Promise`\<`void`\>

Resolves after listeners and device-owned streams close and disabled intent is saved.

#### Throws

RemoteProtocolError when disabled intent cannot be durably saved.

***

### enable()

> **enable**(): `Promise`\<`void`\>

Persists activation and starts the selected private listener.

#### Returns

`Promise`\<`void`\>

Resolves after durable activation and listener setup.

#### Throws

RemoteProtocolError when activation cannot be saved or no private interface is usable.

***

### reconcile()

> **reconcile**(): `Promise`\<`void`\>

Rechecks the private network interface and rebinds the listener when it changed.

#### Returns

`Promise`\<`void`\>

Resolves after the listener and the selected interface agree.

#### Throws

RemoteProtocolError when the network or persistent state is unavailable.

***

### revokeAllDevices()

> **revokeAllDevices**(): `Promise`\<`void`\>

Revokes every durable device grant and cancels their active remote work.

#### Returns

`Promise`\<`void`\>

Resolves after all durable grants are removed and their streams are canceled.

#### Remarks

The saved activation intent is unchanged, so remote access stays enabled for new pairings.

#### Throws

RemoteProtocolError when the revocation cannot be saved.

***

### revokeDevice()

> **revokeDevice**(`deviceId`): `Promise`\<`void`\>

Revokes one durable device grant and cancels its active remote work.

#### Parameters

##### deviceId

`string`

Opaque device identifier from the current status projection.

#### Returns

`Promise`\<`void`\>

Resolves after durable revocation and cancellation of the device's streams.

#### Throws

RemoteProtocolError when the device does not exist or revocation cannot be saved.

***

### status()

> **status**(): [`IRemoteHostStatus`](IRemoteHostStatus.md)

Reads sanitized listener and device state.

#### Returns

[`IRemoteHostStatus`](IRemoteHostStatus.md)

Current status without credentials, token digests or pairing challenges.

#### Throws

RemoteProtocolError when the authorization state is not initialized or initialization failed.
