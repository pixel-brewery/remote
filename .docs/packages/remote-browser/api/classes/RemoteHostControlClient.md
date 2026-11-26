# Class: RemoteHostControlClient

Browser client for an application's private local host-control endpoint.

## Remarks

Reads the strictly validated host status and sends the explicit enable, disable, reconcile, pair and
revoke commands. Every call is dispatched exactly once with same-origin credentials, refused redirects, a
deadline and a bounded body; nothing is retried or cached. The client keeps no status: it owns only the abort
controller of each in-flight call. A failed mutating command may already have persisted its intent, so callers
read [RemoteHostControlClient.status](#status) again before presenting the outcome.

## Example

```ts
const client = new RemoteHostControlClient({ fetch: window.fetch.bind(window) });
const status = await client.enable();
const url = client.createPairingUrl(await client.pair(), status);
client.dispose();
```

## Constructors

### Constructor

> **new RemoteHostControlClient**(`_options`): `RemoteHostControlClient`

Validate the endpoint prefix and bounds without dispatching a request.

#### Parameters

##### \_options

[`IRemoteHostControlClientOptions`](../interfaces/IRemoteHostControlClientOptions.md)

Bound fetch, optional availability guard, route prefix, deadline and response bound.

#### Returns

`RemoteHostControlClient`

#### Throws

TypeError for a prefix that is not a plain absolute path without trailing slash, query or fragment.

#### Throws

RangeError when the deadline or response bound is not a positive safe integer.

## Methods

### createPairingUrl()

> **createPairingUrl**(`bootstrap`, `status`): `string`

Check an invitation against the status it was created for and encode its pairing URL.

#### Parameters

##### bootstrap

`IRemotePairingBootstrap`

Invitation returned by [RemoteHostControlClient.pair](#pair).

##### status

`IRemoteHostStatusSnapshot`

Current validated status of the same host.

#### Returns

`string`

The fragment-based pairing URL for QR rendering or conscious copying; treat it as a secret.

#### Remarks

The bootstrap must belong to the status host's app and installation, use one of its advertised
endpoint origins and expire within the longest lifetime the core access service accepts (15 minutes). Clear the URL from the view when it expires.

#### Throws

RemoteHostControlError with `invalid-invitation` for a malformed, foreign, unadvertised, expired or overlong invitation.

***

### disable()

> **disable**(): `Promise`\<`Readonly`\<\{ `access`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `devices`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `capabilities`: ...; `id`: ...; `lastSeenAt`: ...; `name`: ...; `pairedAt`: ...; \}, `z.core.$strict`\>\>\>\>; `enabled`: `z.ZodBoolean`; `pendingPairings`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `deviceName`: ...; `expiresAt`: ...; `id`: ...; \}, `z.core.$strict`\>\>\>\>; \}, `z.core.$strict`\>\>; `errorCode?`: `string`; `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `id`: ...; `origin`: ...; `transportId`: ...; \}, `z.core.$strict`\>\>\>\>; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<`1`\>; \}, `z.core.$strict`\>\>; `state`: `"disabled"` \| `"disposed"` \| `"available"` \| `"rebinding"` \| `"starting"` \| `"stopping"` \| `"unavailable"`; \}\>\>

Stop remote access and persist the disabled intent.

#### Returns

`Promise`\<`Readonly`\<\{ `access`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `devices`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `capabilities`: ...; `id`: ...; `lastSeenAt`: ...; `name`: ...; `pairedAt`: ...; \}, `z.core.$strict`\>\>\>\>; `enabled`: `z.ZodBoolean`; `pendingPairings`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `deviceName`: ...; `expiresAt`: ...; `id`: ...; \}, `z.core.$strict`\>\>\>\>; \}, `z.core.$strict`\>\>; `errorCode?`: `string`; `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `id`: ...; `origin`: ...; `transportId`: ...; \}, `z.core.$strict`\>\>\>\>; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<`1`\>; \}, `z.core.$strict`\>\>; `state`: `"disabled"` \| `"disposed"` \| `"available"` \| `"rebinding"` \| `"starting"` \| `"stopping"` \| `"unavailable"`; \}\>\>

The validated status after the command.

#### Throws

RemoteHostControlError when the command fails; read the status to learn the actual state.

***

### dispose()

> **dispose**(): `void`

Abort every in-flight command and reject later calls.

#### Returns

`void`

#### Remarks

Idempotent. An aborted mutating command may still have reached the host.

***

### enable()

> **enable**(): `Promise`\<`Readonly`\<\{ `access`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `devices`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `capabilities`: ...; `id`: ...; `lastSeenAt`: ...; `name`: ...; `pairedAt`: ...; \}, `z.core.$strict`\>\>\>\>; `enabled`: `z.ZodBoolean`; `pendingPairings`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `deviceName`: ...; `expiresAt`: ...; `id`: ...; \}, `z.core.$strict`\>\>\>\>; \}, `z.core.$strict`\>\>; `errorCode?`: `string`; `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `id`: ...; `origin`: ...; `transportId`: ...; \}, `z.core.$strict`\>\>\>\>; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<`1`\>; \}, `z.core.$strict`\>\>; `state`: `"disabled"` \| `"disposed"` \| `"available"` \| `"rebinding"` \| `"starting"` \| `"stopping"` \| `"unavailable"`; \}\>\>

Persist activation intent and wait for the host's resulting listener state.

#### Returns

`Promise`\<`Readonly`\<\{ `access`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `devices`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `capabilities`: ...; `id`: ...; `lastSeenAt`: ...; `name`: ...; `pairedAt`: ...; \}, `z.core.$strict`\>\>\>\>; `enabled`: `z.ZodBoolean`; `pendingPairings`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `deviceName`: ...; `expiresAt`: ...; `id`: ...; \}, `z.core.$strict`\>\>\>\>; \}, `z.core.$strict`\>\>; `errorCode?`: `string`; `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `id`: ...; `origin`: ...; `transportId`: ...; \}, `z.core.$strict`\>\>\>\>; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<`1`\>; \}, `z.core.$strict`\>\>; `state`: `"disabled"` \| `"disposed"` \| `"available"` \| `"rebinding"` \| `"starting"` \| `"stopping"` \| `"unavailable"`; \}\>\>

The validated status after the command; activation may report an unavailable listener.

#### Throws

RemoteHostControlError when the command fails; its intent may still have been saved.

***

### pair()

> **pair**(`endpointId?`): `Promise`\<`Readonly`\<\{ `appId`: `string`; `challenge`: `string`; `expiresAt`: `string`; `hostId`: `string`; `origin`: `string`; \}\>\>

Create one short-lived invitation for an advertised endpoint.

#### Parameters

##### endpointId?

`string`

Optional advertised endpoint identifier, at most 120 characters; omission selects the host default.

#### Returns

`Promise`\<`Readonly`\<\{ `appId`: `string`; `challenge`: `string`; `expiresAt`: `string`; `hostId`: `string`; `origin`: `string`; \}\>\>

The schema-validated bootstrap. It is secret material: display it, never log or persist it.

#### Throws

RemoteHostControlError with `invalid-request` for a malformed endpoint identifier, before dispatch.

#### Throws

RemoteHostControlError when the command fails or returns an invalid bootstrap.

***

### reconcile()

> **reconcile**(): `Promise`\<`Readonly`\<\{ `access`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `devices`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `capabilities`: ...; `id`: ...; `lastSeenAt`: ...; `name`: ...; `pairedAt`: ...; \}, `z.core.$strict`\>\>\>\>; `enabled`: `z.ZodBoolean`; `pendingPairings`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `deviceName`: ...; `expiresAt`: ...; `id`: ...; \}, `z.core.$strict`\>\>\>\>; \}, `z.core.$strict`\>\>; `errorCode?`: `string`; `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `id`: ...; `origin`: ...; `transportId`: ...; \}, `z.core.$strict`\>\>\>\>; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<`1`\>; \}, `z.core.$strict`\>\>; `state`: `"disabled"` \| `"disposed"` \| `"available"` \| `"rebinding"` \| `"starting"` \| `"stopping"` \| `"unavailable"`; \}\>\>

Ask the host to recheck its selected private network address, for example after a network change or standby.

#### Returns

`Promise`\<`Readonly`\<\{ `access`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `devices`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `capabilities`: ...; `id`: ...; `lastSeenAt`: ...; `name`: ...; `pairedAt`: ...; \}, `z.core.$strict`\>\>\>\>; `enabled`: `z.ZodBoolean`; `pendingPairings`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `deviceName`: ...; `expiresAt`: ...; `id`: ...; \}, `z.core.$strict`\>\>\>\>; \}, `z.core.$strict`\>\>; `errorCode?`: `string`; `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `id`: ...; `origin`: ...; `transportId`: ...; \}, `z.core.$strict`\>\>\>\>; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<`1`\>; \}, `z.core.$strict`\>\>; `state`: `"disabled"` \| `"disposed"` \| `"available"` \| `"rebinding"` \| `"starting"` \| `"stopping"` \| `"unavailable"`; \}\>\>

The validated status after reconciliation.

#### Throws

RemoteHostControlError when the command fails.

***

### revoke()

> **revoke**(`deviceId`): `Promise`\<`Readonly`\<\{ `access`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `devices`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `capabilities`: ...; `id`: ...; `lastSeenAt`: ...; `name`: ...; `pairedAt`: ...; \}, `z.core.$strict`\>\>\>\>; `enabled`: `z.ZodBoolean`; `pendingPairings`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `deviceName`: ...; `expiresAt`: ...; `id`: ...; \}, `z.core.$strict`\>\>\>\>; \}, `z.core.$strict`\>\>; `errorCode?`: `string`; `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `id`: ...; `origin`: ...; `transportId`: ...; \}, `z.core.$strict`\>\>\>\>; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<`1`\>; \}, `z.core.$strict`\>\>; `state`: `"disabled"` \| `"disposed"` \| `"available"` \| `"rebinding"` \| `"starting"` \| `"stopping"` \| `"unavailable"`; \}\>\>

Revoke exactly one device grant and wait for the host's durable result.

#### Parameters

##### deviceId

`string`

Identifier taken from the last status device list, at most 160 characters.

#### Returns

`Promise`\<`Readonly`\<\{ `access`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `devices`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `capabilities`: ...; `id`: ...; `lastSeenAt`: ...; `name`: ...; `pairedAt`: ...; \}, `z.core.$strict`\>\>\>\>; `enabled`: `z.ZodBoolean`; `pendingPairings`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `deviceName`: ...; `expiresAt`: ...; `id`: ...; \}, `z.core.$strict`\>\>\>\>; \}, `z.core.$strict`\>\>; `errorCode?`: `string`; `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `id`: ...; `origin`: ...; `transportId`: ...; \}, `z.core.$strict`\>\>\>\>; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<`1`\>; \}, `z.core.$strict`\>\>; `state`: `"disabled"` \| `"disposed"` \| `"available"` \| `"rebinding"` \| `"starting"` \| `"stopping"` \| `"unavailable"`; \}\>\>

The validated status after revocation.

#### Throws

RemoteHostControlError with `invalid-request` for a malformed device identifier, before dispatch.

#### Throws

RemoteHostControlError when the command fails.

***

### status()

> **status**(): `Promise`\<`Readonly`\<\{ `access`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `devices`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `capabilities`: ...; `id`: ...; `lastSeenAt`: ...; `name`: ...; `pairedAt`: ...; \}, `z.core.$strict`\>\>\>\>; `enabled`: `z.ZodBoolean`; `pendingPairings`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `deviceName`: ...; `expiresAt`: ...; `id`: ...; \}, `z.core.$strict`\>\>\>\>; \}, `z.core.$strict`\>\>; `errorCode?`: `string`; `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `id`: ...; `origin`: ...; `transportId`: ...; \}, `z.core.$strict`\>\>\>\>; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<`1`\>; \}, `z.core.$strict`\>\>; `state`: `"disabled"` \| `"disposed"` \| `"available"` \| `"rebinding"` \| `"starting"` \| `"stopping"` \| `"unavailable"`; \}\>\>

Read the actual host status without changing activation or device grants.

#### Returns

`Promise`\<`Readonly`\<\{ `access`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `devices`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `capabilities`: ...; `id`: ...; `lastSeenAt`: ...; `name`: ...; `pairedAt`: ...; \}, `z.core.$strict`\>\>\>\>; `enabled`: `z.ZodBoolean`; `pendingPairings`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `deviceName`: ...; `expiresAt`: ...; `id`: ...; \}, `z.core.$strict`\>\>\>\>; \}, `z.core.$strict`\>\>; `errorCode?`: `string`; `host`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `endpoints`: `z.ZodReadonly`\<`z.ZodArray`\<`z.ZodReadonly`\<`z.ZodObject`\<\{ `id`: ...; `origin`: ...; `transportId`: ...; \}, `z.core.$strict`\>\>\>\>; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `name`: `z.ZodString`; `protocolVersion`: `z.ZodLiteral`\<`1`\>; \}, `z.core.$strict`\>\>; `state`: `"disabled"` \| `"disposed"` \| `"available"` \| `"rebinding"` \| `"starting"` \| `"stopping"` \| `"unavailable"`; \}\>\>

The strictly validated, frozen status snapshot.

#### Throws

RemoteHostControlError for an unavailable guard, disposal, deadline, transport, rejection or invalid body.
