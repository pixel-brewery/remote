# Class: NodeRemoteClientTransport

Streaming Node channel. Bearer credentials never leave this privileged object.

## Implements

- `IRemoteClientTransport`

## Constructors

### Constructor

> **new NodeRemoteClientTransport**(`_endpoint`, `_options`, `_ownerSignal`): `NodeRemoteClientTransport`

Created by NodeRemoteConnector after destination-policy validation.

#### Parameters

##### \_endpoint

`IRemoteEndpoint`

Previously validated numeric private peer and its transport identifier.

##### \_options

[`INodeRemoteConnectorOptions`](../interfaces/INodeRemoteConnectorOptions.md)

Application-owned composition, routes and runtime limits for this owner.

##### \_ownerSignal

`AbortSignal`

Connection lifetime signal. Aborting it disposes requests and event streams.

#### Returns

`NodeRemoteClientTransport`

## Methods

### describe()

> **describe**(`signal`): `Promise`\<`Readonly`\<\{ `endpoints`: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `string`; `protocolVersion`: `1`; \}\>\>

Verifies public app/installation identity before credentials may be read or sent.

#### Parameters

##### signal

`AbortSignal`

Cancellation signal for this operation; cancellation never rolls back an application mutation already admitted by the host.

#### Returns

`Promise`\<`Readonly`\<\{ `endpoints`: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `string`; `protocolVersion`: `1`; \}\>\>

The validated public descriptor for the expected application and installation.

#### Implementation of

`IRemoteClientTransport.describe`

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Aborts pending requests and event streams; no durable device grant is deleted.

#### Returns

`Promise`\<`void`\>

Resolves after owned resources close. Repeated calls do not create additional work.

#### Implementation of

`IRemoteClientTransport.dispose`

***

### openWebSocket()

> **openWebSocket**(`path`, `signal`): `Promise`\<`WebSocket`\>

Opens one registered authenticated WebSocket; callers own message-level product validation.

#### Parameters

##### path

`string`

Origin-form request target whose path is admitted by the route registry; queries are preserved by transports.

##### signal

`AbortSignal`

Cancellation signal for this operation; cancellation never rolls back an application mutation already admitted by the host.

#### Returns

`Promise`\<`WebSocket`\>

The open owned socket. Close it when the consuming view no longer needs the event stream.

***

### pair()

> **pair**(`input`, `deviceName`, `attemptId`, `signal`): `Promise`\<`Readonly`\<\{ `expiresAt`: `string`; `pairingId`: `string`; `status`: `"pending"`; \}\> \| `Readonly`\<\{ `credential?`: `string`; `session`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<...\>; `identity`: `z.ZodReadonly`\<...\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<...\>; \}, `z.core.$strict`\>\>; `principal`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `capabilities`: `z.ZodReadonly`\<...\>; `deviceId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; \}, `z.core.$strict`\>\>; `status`: `"paired"`; \}\>\>

Completes the same host-bound attempt and stores its bearer privately before reporting success.

#### Parameters

##### input

`IRemotePairingBootstrap`

Untrusted input validated by the canonical contract before use.

##### deviceName

`string`

Trimmed human-readable device label bound to this pairing attempt.

##### attemptId

`string`

Stable client attempt identifier reused unchanged after uncertain pairing responses.

##### signal

`AbortSignal`

Cancellation signal for this operation; cancellation never rolls back an application mutation already admitted by the host.

#### Returns

`Promise`\<`Readonly`\<\{ `expiresAt`: `string`; `pairingId`: `string`; `status`: `"pending"`; \}\> \| `Readonly`\<\{ `credential?`: `string`; `session`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<...\>; `identity`: `z.ZodReadonly`\<...\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<...\>; \}, `z.core.$strict`\>\>; `principal`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `capabilities`: `z.ZodReadonly`\<...\>; `deviceId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; \}, `z.core.$strict`\>\>; `status`: `"paired"`; \}\>\>

A pending approval or credential-free paired result, after native credential storage succeeds.

#### Remarks

Retrying the same attempt recovers an uncertain response. The bearer is stored through the protected credential port and removed from the returned descriptor.

#### Throws

RemoteProtocolError for a foreign invitation, host rejection, cancellation or protected-storage failure.

#### Implementation of

`IRemoteClientTransport.pair`

***

### request()

> **request**(`request`): `Promise`\<`IRemoteByteResponse`\>

Dispatches one admitted request with byte-stream backpressure and no redirect or write replay.

#### Parameters

##### request

`IRemoteByteRequest`

Original or portable HTTP request. Streaming bodies remain owned by the caller until consumed or canceled.

#### Returns

`Promise`\<`IRemoteByteResponse`\>

A streamed response. Consume its body or call cancel to release the connection.

#### Remarks

Requests are sent once. A disconnect after accepting a mutation does not establish whether its business effect completed.

#### Throws

RemoteProtocolError for an unregistered route, protected header, bound violation, redirect or unavailable connection.

#### Implementation of

`IRemoteClientTransport.request`

***

### resourceUrl()

> **resourceUrl**(`path`): `string`

Resolves an admitted read path without including a credential.

#### Parameters

##### path

`string`

Origin-form request target whose path is admitted by the route registry; queries are preserved by transports.

#### Returns

`string`

An admitted resource address without any credential in its path or query.

#### Implementation of

`IRemoteClientTransport.resourceUrl`

***

### revoke()

> **revoke**(`signal`): `Promise`\<`void`\>

Durably revokes this device; local deletion occurs only after the host accepts revocation.

#### Parameters

##### signal

`AbortSignal`

Cancellation signal for this operation; cancellation never rolls back an application mutation already admitted by the host.

#### Returns

`Promise`\<`void`\>

Resolves after host revocation and the corresponding local credential deletion.

#### Implementation of

`IRemoteClientTransport.revoke`

***

### session()

> **session**(`signal`): `Promise`\<`Readonly`\<\{ `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<..., ...\>\>\>\>; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<`1`\>; \}, `z.core.$strict`\>\>; `principal`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `capabilities`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodString`\>\>; `deviceId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; \}\> \| `null`\>

Restores only this app/installation credential; 401 clears its stale local secret.

#### Parameters

##### signal

`AbortSignal`

Cancellation signal for this operation; cancellation never rolls back an application mutation already admitted by the host.

#### Returns

`Promise`\<`Readonly`\<\{ `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<..., ...\>\>\>\>; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<`1`\>; \}, `z.core.$strict`\>\>; `principal`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `capabilities`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodString`\>\>; `deviceId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; \}\> \| `null`\>

The restored device session, or null when no usable credential is available.

#### Implementation of

`IRemoteClientTransport.session`
