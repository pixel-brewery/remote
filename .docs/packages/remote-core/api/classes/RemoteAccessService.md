# Class: RemoteAccessService

Owns durable device authorization and transient one-use pairing challenges.
All durable mutations are serialized through one writer. Applications own the store and clock.

## Constructors

### Constructor

> **new RemoteAccessService**(`_dependencies`): `RemoteAccessService`

Binds one installation to application-owned infrastructure; performs no I/O.

#### Parameters

##### \_dependencies

[`IRemoteAccessDependencies`](../interfaces/IRemoteAccessDependencies.md)

Application-owned persistence, entropy, clock, identity and pairing policy.

#### Returns

`RemoteAccessService`

## Accessors

### enabled

#### Get Signature

> **get** **enabled**(): `boolean`

The persisted activation intent; network availability is a transport responsibility.

##### Returns

`boolean`

The last committed activation intent; false before initialization.

***

### initialized

#### Get Signature

> **get** **initialized**(): `boolean`

Whether durable initialization has completed.

##### Returns

`boolean`

True after successful canonical restoration or initial record creation.

## Methods

### approvePairing()

> **approvePairing**(`pairingId`): `Promise`\<`void`\>

Approves a still-valid attempt when the application opts into host approval.

#### Parameters

##### pairingId

`string`

Opaque consumed-attempt identifier from the sanitized host-administration state.

#### Returns

`Promise`\<`void`\>

Resolves after the device grant is committed. The client receives it by retrying the same pairing attempt.

***

### authorize()

> **authorize**(`credential`): `Promise`\<`Readonly`\<\{ `appId`: `string`; `capabilities`: readonly `string`[]; `deviceId`: `string`; `hostId`: `string`; \}\>\>

Validates a credential without turning application reads into persistence writes.

#### Parameters

##### credential

`string`

Plaintext device bearer confined to the privileged runtime. Never project or log it.

#### Returns

`Promise`\<`Readonly`\<\{ `appId`: `string`; `capabilities`: readonly `string`[]; `deviceId`: `string`; `hostId`: `string`; \}\>\>

The authenticated device principal bound to this application and installation.

***

### completePairing()

> **completePairing**(`input`): `Promise`\<[`IRemotePairingGrant`](../type-aliases/IRemotePairingGrant.md)\>

Completes or resumes exactly one attempt. A challenge cannot be reassigned to another device.

#### Parameters

##### input

`IRemotePairingRequest`

Canonical attempt with a stable client-generated identifier.

#### Returns

`Promise`\<[`IRemotePairingGrant`](../type-aliases/IRemotePairingGrant.md)\>

An ephemeral grant, never a persisted cleartext credential.

#### Remarks

Challenge possession consumes one attempt. Repeating the same attempt, label and credential mode is safe until expiry; another attempt is rejected.

#### Throws

RemoteProtocolError for disabled access, expired or consumed challenges, bounds or persistence failures.

***

### createPairing()

> **createPairing**(`origin`): `Promise`\<`Readonly`\<\{ `appId`: `string`; `challenge`: `string`; `expiresAt`: `string`; `hostId`: `string`; `origin`: `string`; \}\>\>

Creates bounded transient material for the host's QR or copyable pairing URL.

#### Parameters

##### origin

`string`

Selected advertised HTTP(S) origin to bind into the one-use pairing invitation.

#### Returns

`Promise`\<`Readonly`\<\{ `appId`: `string`; `challenge`: `string`; `expiresAt`: `string`; `hostId`: `string`; `origin`: `string`; \}\>\>

The secret-bearing invitation for the selected endpoint. Deliver it out of band and never log it.

#### Remarks

The default lifetime is five minutes and the challenge has 32 bytes of entropy. Only its digest is retained.

#### Throws

RemoteProtocolError when access is disabled or the pending-invitation limit is reached.

***

### getStatus()

> **getStatus**(): [`IRemoteAccessStatus`](../interfaces/IRemoteAccessStatus.md)

Returns a sanitized administration projection.

#### Returns

[`IRemoteAccessStatus`](../interfaces/IRemoteAccessStatus.md)

A detached administration projection without plaintext credentials or digests.

***

### initialize()

> **initialize**(): `Promise`\<`void`\>

Restores and validates the private state once. A foreign installation record fails closed.

#### Returns

`Promise`\<`void`\>

Resolves after validated restoration and any requested lifecycle reconciliation.

#### Throws

RemoteProtocolError when storage fails or contains a malformed or foreign installation record.

***

### invalidatePendingPairings()

> **invalidatePendingPairings**(): `void`

Invalidates bootstrap material after network rebind, stop or process shutdown.

#### Returns

`void`

***

### rejectPairing()

> **rejectPairing**(`pairingId`): `Promise`\<`void`\>

Rejects an attempt and consumes its challenge.

#### Parameters

##### pairingId

`string`

Opaque consumed-attempt identifier from the sanitized host-administration state.

#### Returns

`Promise`\<`void`\>

Completes after the selected pending invitation is invalidated.

***

### revokeAllDevices()

> **revokeAllDevices**(): `Promise`\<`void`\>

Revokes every durable device and every transient pairing.

#### Returns

`Promise`\<`void`\>

Resolves after all durable grants are removed and their streams are canceled.

***

### revokeDevice()

> **revokeDevice**(`deviceId`): `Promise`\<`void`\>

Atomically revokes a device and notifies owned transports after durable commit.

#### Parameters

##### deviceId

`string`

Identifier of the device whose durable grant and owned streams must be revoked.

#### Returns

`Promise`\<`void`\>

Resolves after durable removal and synchronous revocation notification.

#### Throws

RemoteProtocolError when the device is absent or persistence fails. Failed persistence leaves its grant active.

***

### setEnabled()

> **setEnabled**(`enabled`): `Promise`\<`void`\>

Saves activation intent. Disabling invalidates pending pairings and live authorization.

#### Parameters

##### enabled

`boolean`

Activation intent to commit before accepting new authorization requests.

#### Returns

`Promise`\<`void`\>

Resolves after the activation intent is durably committed.

***

### subscribe()

> **subscribe**(`listener`): () => `void`

Observes committed pairing, revocation and lifecycle effects. Unsubscribe before disposing a transport.

#### Parameters

##### listener

(`event`) => `void`

Observer invoked when authorization changes; the returned cleanup removes only this registration.

#### Returns

An idempotent cleanup for this registration.

() => `void`

#### Remarks

Listeners run synchronously after the corresponding commit: `paired` after a
new device grant is durably stored, `revoked` after durable removal, and
`disabled` or `pairings-invalidated` after the lifecycle transition. A
failing listener cannot undo the commit and does not affect other listeners.
