# Interface: IRemoteHostLifecycle

Complete lifecycle port of one remote host, as offered by `NodeRemoteHost`.

## Remarks

One application runtime owns the host. Initialization restores saved intent,
reconciliation follows interface changes, and awaited disposal closes remote
resources before the application's own services and datastore close.

## Extends

- [`IRemoteHostControl`](IRemoteHostControl.md)

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

#### Inherited from

[`IRemoteHostControl`](IRemoteHostControl.md).[`createPairing`](IRemoteHostControl.md#createpairing)

***

### disable()

> **disable**(): `Promise`\<`void`\>

Closes remote work and durably records disabled intent.

#### Returns

`Promise`\<`void`\>

Resolves after listeners and device-owned streams close and disabled intent is saved.

#### Throws

RemoteProtocolError when disabled intent cannot be durably saved.

#### Inherited from

[`IRemoteHostControl`](IRemoteHostControl.md).[`disable`](IRemoteHostControl.md#disable)

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Disposes listeners and streams while retaining durable activation intent.

#### Returns

`Promise`\<`void`\>

Resolves after every host-owned remote resource closes.

#### Throws

An error when owned shutdown fails.

***

### enable()

> **enable**(): `Promise`\<`void`\>

Persists activation and starts the selected private listener.

#### Returns

`Promise`\<`void`\>

Resolves after durable activation and listener setup.

#### Throws

RemoteProtocolError when activation cannot be saved or no private interface is usable.

#### Inherited from

[`IRemoteHostControl`](IRemoteHostControl.md).[`enable`](IRemoteHostControl.md#enable)

***

### initialize()

> **initialize**(): `Promise`\<`void`\>

Restores device state and a previously enabled listener.

#### Returns

`Promise`\<`void`\>

Resolves after authorization restoration and any persisted listener start.

#### Throws

RemoteProtocolError for unavailable storage, assets or network interfaces.

***

### reconcile()

> **reconcile**(): `Promise`\<`void`\>

Rechecks the private network interface and rebinds the listener when it changed.

#### Returns

`Promise`\<`void`\>

Resolves after the listener and the selected interface agree.

#### Throws

RemoteProtocolError when the network or persistent state is unavailable.

#### Inherited from

[`IRemoteHostControl`](IRemoteHostControl.md).[`reconcile`](IRemoteHostControl.md#reconcile)

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

#### Inherited from

[`IRemoteHostControl`](IRemoteHostControl.md).[`revokeAllDevices`](IRemoteHostControl.md#revokealldevices)

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

#### Inherited from

[`IRemoteHostControl`](IRemoteHostControl.md).[`revokeDevice`](IRemoteHostControl.md#revokedevice)

***

### status()

> **status**(): [`IRemoteHostStatus`](IRemoteHostStatus.md)

Reads sanitized listener and device state.

#### Returns

[`IRemoteHostStatus`](IRemoteHostStatus.md)

Current status without credentials, token digests or pairing challenges.

#### Throws

RemoteProtocolError when the authorization state is not initialized or initialization failed.

#### Inherited from

[`IRemoteHostControl`](IRemoteHostControl.md).[`status`](IRemoteHostControl.md#status)

***

### subscribe()

> **subscribe**(`listener`): () => `void`

Observes committed access events of the host's authorization owner.

#### Parameters

##### listener

(`event`) => `void`

Synchronous observer of pairing, revocation and lifecycle events.

#### Returns

An idempotent cleanup removing only this registration.

() => `void`
