# Class: RemoteSession

Owns one host session, bounded restore retries and cancellation of its requests.

## Remarks

Construct without side effects, initialize explicitly and dispose when the owner closes.
Reconnect restores authentication and asks observers to reconcile reads; writes are never replayed.

## Example

```ts
const session = new RemoteSession(options);
const stop = session.subscribe(state => render(state));
await session.initialize();
stop();
await session.dispose();
```

## Constructors

### Constructor

> **new RemoteSession**(`_options`): `RemoteSession`

Compose one selected endpoint with its runtime connector and clock.

#### Parameters

##### \_options

[`IRemoteSessionOptions`](../interfaces/IRemoteSessionOptions.md)

Immutable host identity, endpoint and explicitly supplied environment ports.

#### Returns

`RemoteSession`

#### Throws

RemoteClientError when connector and endpoint transport identifiers differ.

#### Throws

RangeError when retry bounds are negative or not safe integers.

## Accessors

### state

#### Get Signature

> **get** **state**(): [`RemoteSessionState`](../type-aliases/RemoteSessionState.md)

Current immutable credential-free lifecycle snapshot.

##### Returns

[`RemoteSessionState`](../type-aliases/RemoteSessionState.md)

## Methods

### disconnect()

> **disconnect**(): `Promise`\<`void`\>

Cancel streams while retaining the durable profile and host grant.

#### Returns

`Promise`\<`void`\>

Completion after transport cleanup.

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Permanently close the session, observers, requests and retry timer.

#### Returns

`Promise`\<`void`\>

Idempotent cleanup completion.

***

### initialize()

> **initialize**(): `Promise`\<`void`\>

Verify public identity and restore the device session once.

#### Returns

`Promise`\<`void`\>

A shared initialization promise for simultaneous callers.

#### Throws

RemoteClientError when disposed, unreachable or incompatible.

***

### onReconcile()

> **onReconcile**(`listener`): () => `void`

Observe successful session restores for product read reconciliation.

#### Parameters

##### listener

() => `void`

Callback which schedules domain reads, never mutation replay.

#### Returns

Unsubscribe function.

() => `void`

***

### pair()

> **pair**(`bootstrap`, `deviceName`): `Promise`\<`void`\>

Complete or resume the invitation's stable idempotent pairing attempt.

#### Parameters

##### bootstrap

`IRemotePairingBootstrap`

Unexpired invitation matching the selected app, host and origin.

##### deviceName

`string`

User-chosen device label; trimmed and bounded to 120 characters.

#### Returns

`Promise`\<`void`\>

Completion after the paired or pending-approval snapshot is published.

#### Throws

RemoteClientError for expired/mismatched invitations or changed attempt labels.

***

### request()

> **request**(`request`): `Promise`\<`IRemoteByteResponse`\>

Send an admitted product request exactly once and preserve streamed response bytes.

#### Parameters

##### request

`IRemoteByteRequest`

Method, relative path and optional owned body/cancellation signal.

#### Returns

`Promise`\<`IRemoteByteResponse`\>

Response whose body or cancel method must be consumed by the caller.

#### Throws

RemoteClientError with OUTCOME_UNKNOWN after a dispatched mutation loses its response.

***

### resourceUrl()

> **resourceUrl**(`path`): `string`

Resolve content without adding a bearer credential to its URL.

#### Parameters

##### path

`string`

Registered relative content path, including an optional query.

#### Returns

`string`

Same-origin browser or protected native gateway URL.

#### Throws

RemoteClientError when no ready connection exists.

***

### retry()

> **retry**(): `Promise`\<`void`\>

Reset the restore budget and reconnect explicitly.

#### Returns

`Promise`\<`void`\>

Session restore completion; no application operation is replayed.

***

### revoke()

> **revoke**(): `Promise`\<`void`\>

Revoke this device grant on the host and cancel the local connection.

#### Returns

`Promise`\<`void`\>

Completion after the server acknowledged revocation.

#### Throws

RemoteClientError when no active transport exists; network errors preserve the grant.

***

### subscribe()

> **subscribe**(`listener`): () => `void`

Subscribe to snapshots, immediately receiving the current state.

#### Parameters

##### listener

(`state`) => `void`

Synchronous observer owned by the caller.

#### Returns

Unsubscribe function, safe to call repeatedly.

() => `void`
