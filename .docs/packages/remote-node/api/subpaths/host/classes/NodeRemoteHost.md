# Class: NodeRemoteHost

Supervised private-LAN host. One application dispatcher owns product validation and authorization.
Network, listeners and streams start only through initialize/enable/reconcile and are disposed explicitly.

## Constructors

### Constructor

> **new NodeRemoteHost**(`_options`): `NodeRemoteHost`

Binds a product adapter and private network policy without starting I/O.

#### Parameters

##### \_options

[`INodeRemoteHostOptions`](../interfaces/INodeRemoteHostOptions.md)

Application-owned composition, routes and runtime limits for this owner.

#### Returns

`NodeRemoteHost`

## Accessors

### descriptor

#### Get Signature

> **get** **descriptor**(): `IRemoteHostDescriptor`

Public descriptor. No credential or product snapshot is exposed here.

##### Returns

`IRemoteHostDescriptor`

The credential-free public descriptor and currently bound connection origins.

## Methods

### createPairing()

> **createPairing**(`endpointId?`): `Promise`\<`Readonly`\<\{ `appId`: `string`; `challenge`: `string`; `expiresAt`: `string`; `hostId`: `string`; `origin`: `string`; \}\>\>

Creates an out-of-band challenge for one available endpoint.

#### Parameters

##### endpointId?

`string`

Optional endpoint identifier. Omission selects the first available advertised endpoint.

#### Returns

`Promise`\<`Readonly`\<\{ `appId`: `string`; `challenge`: `string`; `expiresAt`: `string`; `hostId`: `string`; `origin`: `string`; \}\>\>

The secret-bearing invitation for the selected endpoint. Deliver it out of band and never log it.

***

### disable()

> **disable**(): `Promise`\<`void`\>

Closes access first, then persists disabled intent. A failed save keeps this runtime stopped until an explicit enable.

#### Returns

`Promise`\<`void`\>

Resolves after listeners close and disabled intent is durably stored.

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Stops resources without clearing durable activation; safe to call repeatedly.

#### Returns

`Promise`\<`void`\>

Resolves after owned resources close. Repeated calls do not create additional work.

***

### enable()

> **enable**(): `Promise`\<`void`\>

Persists activation before starting; unavailable networks retain the user's intent.

#### Returns

`Promise`\<`void`\>

Resolves after durable activation and successful listener binding.

***

### initialize()

> **initialize**(): `Promise`\<`void`\>

Restores authorization and immutable asset root, then reconciles persisted activation.

#### Returns

`Promise`\<`void`\>

Resolves after validated restoration and any requested lifecycle reconciliation.

***

### reconcile()

> **reconcile**(): `Promise`\<`void`\>

Serializes network re-evaluation; no-op when the selected interface is unchanged.

#### Returns

`Promise`\<`void`\>

Resolves after the current selected interface and listener state agree.

***

### revokeAllDevices()

> **revokeAllDevices**(): `Promise`\<`void`\>

Revokes every device without removing the stored activation preference.

#### Returns

`Promise`\<`void`\>

Resolves after all durable grants are removed and their streams are canceled.

***

### revokeDevice()

> **revokeDevice**(`deviceId`): `Promise`\<`void`\>

Revokes one device; its active requests and sockets close on the durable change event.

#### Parameters

##### deviceId

`string`

Identifier of the device whose durable grant and owned streams must be revoked.

#### Returns

`Promise`\<`void`\>

Resolves after durable removal and synchronous revocation notification.

***

### status()

> **status**(): [`IRemoteHostStatus`](../interfaces/IRemoteHostStatus.md)

Returns sanitized network/device state after initialization.

#### Returns

[`IRemoteHostStatus`](../interfaces/IRemoteHostStatus.md)

A credential-free snapshot of listener and device-administration state.
