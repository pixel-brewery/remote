# Interface: IRemoteClientTransport

An owned channel to one host. Credentials remain inside its runtime adapter.

## Methods

### describe()

> **describe**(`signal`): `Promise`\<`Readonly`\<\{ `endpoints`: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `string`; `protocolVersion`: `1`; \}\>\>

Read the public identity before restoring a credential.

#### Parameters

##### signal

`AbortSignal`

Cancellation signal owned by the calling lifecycle.

#### Returns

`Promise`\<`Readonly`\<\{ `endpoints`: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `string`; `protocolVersion`: `1`; \}\>\>

Public descriptor before any stored credential is restored.

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Close the channel and cancel its outstanding operations.

#### Returns

`Promise`\<`void`\>

Cleanup completion after owned requests and streams are cancelled.

***

### pair()

> **pair**(`bootstrap`, `deviceName`, `attemptId`, `signal`): `Promise`\<`Readonly`\<\{ `expiresAt`: `string`; `pairingId`: `string`; `status`: `"pending"`; \}\> \| `Readonly`\<\{ `credential?`: `string`; `session`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<...\>; `identity`: `z.ZodReadonly`\<...\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<...\>; \}, `z.core.$strict`\>\>; `principal`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `capabilities`: `z.ZodReadonly`\<...\>; `deviceId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; \}, `z.core.$strict`\>\>; `status`: `"paired"`; \}\>\>

Complete or resume the same idempotent pairing attempt.

#### Parameters

##### bootstrap

`IRemotePairingBootstrap`

Validated short-lived invitation matching the selected host.

##### deviceName

`string`

User-selected device label, trimmed before validation.

##### attemptId

`string`

Stable unique identifier reused only for recovery of this attempt.

##### signal

`AbortSignal`

Cancellation signal owned by the calling lifecycle.

#### Returns

`Promise`\<`Readonly`\<\{ `expiresAt`: `string`; `pairingId`: `string`; `status`: `"pending"`; \}\> \| `Readonly`\<\{ `credential?`: `string`; `session`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<...\>; `identity`: `z.ZodReadonly`\<...\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<...\>; \}, `z.core.$strict`\>\>; `principal`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `capabilities`: `z.ZodReadonly`\<...\>; `deviceId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; \}, `z.core.$strict`\>\>; `status`: `"paired"`; \}\>\>

Paired or pending protocol outcome; credentials remain in the adapter.

***

### request()

> **request**(`request`): `Promise`\<`IRemoteByteResponse`\>

Send one application request. Implementations must never replay writes.

#### Parameters

##### request

`IRemoteByteRequest`

One validated request dispatched without mutation replay.

#### Returns

`Promise`\<`IRemoteByteResponse`\>

Streamed response; the caller must consume its body or cancel it.

***

### resourceUrl()

> **resourceUrl**(`path`): `string`

Resolve a registered relative content path in the local view.

#### Parameters

##### path

`string`

Registered origin-relative content path.

#### Returns

`string`

Credential-free same-origin content URL.

***

### revoke()

> **revoke**(`signal`): `Promise`\<`void`\>

Revoke this device credential on the selected host.

#### Parameters

##### signal

`AbortSignal`

Cancellation signal owned by the calling lifecycle.

#### Returns

`Promise`\<`void`\>

Completion after host revocation is acknowledged.

***

### session()

> **session**(`signal`): `Promise`\<`Readonly`\<\{ `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<..., ...\>\>\>\>; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<`1`\>; \}, `z.core.$strict`\>\>; `principal`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `capabilities`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodString`\>\>; `deviceId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; \}\> \| `null`\>

Restore an existing device session, or return null when pairing is required.

#### Parameters

##### signal

`AbortSignal`

Cancellation signal owned by the calling lifecycle.

#### Returns

`Promise`\<`Readonly`\<\{ `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<..., ...\>\>\>\>; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<`1`\>; \}, `z.core.$strict`\>\>; `principal`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `capabilities`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodString`\>\>; `deviceId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; \}\> \| `null`\>

Verified session, or null when the device needs pairing.
