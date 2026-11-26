# Class: RemoteHostRuntime

Serializes an application's remote host lifecycle and local administration commands.

## Remarks

The wrapped host remains the sole authorization, listener and persistence
owner. Every command runs in one bounded queue (default 16 running or queued
operations); a failed command never blocks later ones. Nothing polls and no
timer is created: the network interface is rechecked when access is enabled,
before every pairing invitation and on an explicit reconcile command. An
availability failure of a lifecycle command (initialize, enable, disable or
reconcile) is retained and projected through [RemoteHostRuntime.status](#status)
without terminating the application; the next successful lifecycle command
clears it. Refused pairings and revocations are the caller's result and never
change the retained availability. The application must await
[RemoteHostRuntime.dispose](#dispose) before closing services the host dispatches to.

## Implements

- [`IRemoteHostLifecycle`](../interfaces/IRemoteHostLifecycle.md)

## Constructors

### Constructor

> **new RemoteHostRuntime**(`_host`, `options?`): `RemoteHostRuntime`

Composes the runtime without starting a listener, timer or I/O.

#### Parameters

##### \_host

[`IRemoteHostLifecycle`](../interfaces/IRemoteHostLifecycle.md)

Host lifecycle owned exclusively by this runtime, normally a `NodeRemoteHost`.

##### options?

[`IRemoteHostRuntimeOptions`](../interfaces/IRemoteHostRuntimeOptions.md) = `{}`

Optional queue bound; `maxPendingOperations` defaults to 16.

#### Returns

`RemoteHostRuntime`

#### Throws

RemoteProtocolError with `invalid-request` when the queue bound is not an integer from 1 to 1024.

## Methods

### createPairing()

> **createPairing**(`endpointId?`): `Promise`\<`Readonly`\<\{ `appId`: `string`; `challenge`: `string`; `expiresAt`: `string`; `hostId`: `string`; `origin`: `string`; \}\>\>

Reconciles the network and then creates an invitation, as one queued operation.

#### Parameters

##### endpointId?

`string`

Optional advertised endpoint identifier; omission selects the first available endpoint.

#### Returns

`Promise`\<`Readonly`\<\{ `appId`: `string`; `challenge`: `string`; `expiresAt`: `string`; `hostId`: `string`; `origin`: `string`; \}\>\>

Secret-bearing invitation exclusively for local out-of-band display.

#### Remarks

The invitation therefore names the address the host has now, never one from
before a network change. A failure is returned to the caller only and does
not change the retained availability state.

#### Throws

RemoteProtocolError with `disposed` after disposal, `resource-limit` when the queue is full,
or the host's error when reconciliation fails or access or the endpoint is unavailable.

#### Implementation of

[`IRemoteHostLifecycle`](../interfaces/IRemoteHostLifecycle.md).[`createPairing`](../interfaces/IRemoteHostLifecycle.md#createpairing)

***

### disable()

> **disable**(): `Promise`\<`void`\>

Disables remote access after earlier commands settle.

#### Returns

`Promise`\<`void`\>

Resolves after remote work closed and disabled intent was saved.

#### Throws

RemoteProtocolError with `disposed` after disposal, `resource-limit` when the queue is full,
or the host's error when disabled intent cannot be persisted.

#### Implementation of

[`IRemoteHostLifecycle`](../interfaces/IRemoteHostLifecycle.md).[`disable`](../interfaces/IRemoteHostLifecycle.md#disable)

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Rejects new commands and closes the host after already accepted work settles.

#### Returns

`Promise`\<`void`\>

The same awaited disposal for every call.

#### Remarks

The running command completes before the host closes. Queued commands that
have not started reject with `disposed`. Disposal retains the last durably
saved activation intent, so a later process restores it.

#### Throws

An error when host resource disposal fails.

#### Implementation of

[`IRemoteHostLifecycle`](../interfaces/IRemoteHostLifecycle.md).[`dispose`](../interfaces/IRemoteHostLifecycle.md#dispose)

***

### enable()

> **enable**(): `Promise`\<`void`\>

Enables remote access after earlier commands settle.

#### Returns

`Promise`\<`void`\>

Resolves after the host saved activation and bound its listener.

#### Throws

RemoteProtocolError with `disposed` after disposal, `resource-limit` when the queue is full,
or the host's error when activation persistence or listener setup fails.

#### Implementation of

[`IRemoteHostLifecycle`](../interfaces/IRemoteHostLifecycle.md).[`enable`](../interfaces/IRemoteHostLifecycle.md#enable)

***

### initialize()

> **initialize**(): `Promise`\<`void`\>

Restores remote state, including a persisted enabled intent.

#### Returns

`Promise`\<`void`\>

Resolves after the restoration attempt has settled, including when it failed.

#### Remarks

Repeated calls share the first attempt. A restoration failure is retained
for [RemoteHostRuntime.status](#status) instead of rejecting, so the rest of the
application stays usable; a later enable or reconcile retries it.

#### Implementation of

[`IRemoteHostLifecycle`](../interfaces/IRemoteHostLifecycle.md).[`initialize`](../interfaces/IRemoteHostLifecycle.md#initialize)

***

### reconcile()

> **reconcile**(): `Promise`\<`void`\>

Rechecks private-interface selection on an explicit command.

#### Returns

`Promise`\<`void`\>

Resolves after host-owned reconciliation.

#### Throws

RemoteProtocolError with `disposed` after disposal, `resource-limit` when the queue is full,
or the host's error while the interface or persistent state is unavailable.

#### Implementation of

[`IRemoteHostLifecycle`](../interfaces/IRemoteHostLifecycle.md).[`reconcile`](../interfaces/IRemoteHostLifecycle.md#reconcile)

***

### revokeDevice()

> **revokeDevice**(`deviceId`): `Promise`\<`void`\>

Revokes one device after earlier commands settle.

#### Parameters

##### deviceId

`string`

Opaque device identifier from the current status projection.

#### Returns

`Promise`\<`void`\>

Resolves after durable revocation and cancellation of the device's streams.

#### Throws

RemoteProtocolError with `disposed` after disposal, `resource-limit` when the queue is full,
or the host's error when the device is unknown or revocation cannot be saved.

#### Implementation of

[`IRemoteHostLifecycle`](../interfaces/IRemoteHostLifecycle.md).[`revokeDevice`](../interfaces/IRemoteHostLifecycle.md#revokedevice)

***

### status()

> **status**(): [`IRemoteHostStatus`](../interfaces/IRemoteHostStatus.md)

Reads a credential-free snapshot including any retained availability failure.

#### Returns

[`IRemoteHostStatus`](../interfaces/IRemoteHostStatus.md)

The host status; while a lifecycle failure is retained and the runtime is live,
its state is `unavailable` and `errorCode` names the failure.

#### Throws

RemoteProtocolError with the retained code when the host cannot produce a snapshot
after a failed initialization, or the host's own error otherwise.

#### Implementation of

[`IRemoteHostLifecycle`](../interfaces/IRemoteHostLifecycle.md).[`status`](../interfaces/IRemoteHostLifecycle.md#status)

***

### subscribe()

> **subscribe**(`listener`): () => `void`

Forwards committed access events of the wrapped host.

#### Parameters

##### listener

(`event`) => `void`

Synchronous observer of pairing, revocation and lifecycle events.

#### Returns

An idempotent cleanup removing only this registration.

() => `void`

#### Remarks

Registrations made here are released when disposal completes, after the
host's own shutdown events were delivered.

#### Throws

RemoteProtocolError with `disposed` after disposal has started.

#### Implementation of

[`IRemoteHostLifecycle`](../interfaces/IRemoteHostLifecycle.md).[`subscribe`](../interfaces/IRemoteHostLifecycle.md#subscribe)
