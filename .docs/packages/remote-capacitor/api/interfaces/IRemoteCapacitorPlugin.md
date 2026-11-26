# Interface: IRemoteCapacitorPlugin

Closed native plugin ABI. Asset roots and route policy are configured natively by the app.

## Methods

### invoke()

> **invoke**(`options`): `Promise`\<[`IRemoteCapacitorResult`](IRemoteCapacitorResult.md)\>

Execute a canonical native control request, never an arbitrary URL.

#### Parameters

##### options

[`IRemoteCapacitorInvocation`](IRemoteCapacitorInvocation.md)

Canonical control payload; arbitrary fetch URLs and credentials are not accepted.

#### Returns

`Promise`\<[`IRemoteCapacitorResult`](IRemoteCapacitorResult.md)\>

Native response envelope awaiting canonical parsing by the TypeScript bridge.

***

### scanPairing()

> **scanPairing**(): `Promise`\<[`IRemoteCapacitorScanResult`](IRemoteCapacitorScanResult.md)\>

Present the platform scanner and return short-lived pairing material only.

#### Returns

`Promise`\<[`IRemoteCapacitorScanResult`](IRemoteCapacitorScanResult.md)\>

Untrusted scan envelope awaiting canonical invitation validation.
