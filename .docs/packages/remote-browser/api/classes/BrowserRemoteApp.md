# Class: BrowserRemoteApp\<TMetadata\>

Pre-framework gate that decides whether a document starts normally or against a verified remote host.

## Remarks

Construct once per document before the application framework loads, call [BrowserRemoteApp.attach](#attach)
and [BrowserRemoteApp.prepare](#prepare), and compose the application on `normal` or `ready`. A start is remote only
with an invitation fragment or inside a native client's protected loopback view; any other answer of the host
probe keeps the ordinary start without publishing an intermediate phase. A remote start restores or completes
cookie pairing through the client `RemoteSession`, then reads the application's metadata before `ready`. Revocation
while ready publishes `pairing-required`. The gate never polls and never replays an application request.

## Example

```ts
const app = new BrowserRemoteApp({ appId: 'example', window, localOrigins: [], readCapabilities });
app.subscribe((phase) => render(phase));
const detach = app.attach();
await app.prepare();
```

## Type Parameters

### TMetadata

`TMetadata`

Application-validated metadata returned by the configured capability read.

## Constructors

### Constructor

> **new BrowserRemoteApp**\<`TMetadata`\>(`_options`): `BrowserRemoteApp`\<`TMetadata`\>

Bind the document environment without networking, storage access or event registration.

#### Parameters

##### \_options

[`IBrowserRemoteAppOptions`](../interfaces/IBrowserRemoteAppOptions.md)\<`TMetadata`\>

Application namespace, window port, local origins, capability read and optional native ports.

#### Returns

`BrowserRemoteApp`\<`TMetadata`\>

#### Throws

Error for an invalid application identifier, a local origin that is not an exact HTTP(S) origin,
an empty attempt storage key or a deadline that is not a positive safe integer.

## Accessors

### hasNativeControl

#### Get Signature

> **get** **hasNativeControl**(): `boolean`

Whether the composition supplied closed native connection controls.

##### Returns

`boolean`

True when connection commands are available; the getter performs no native call.

***

### hasPairingScanner

#### Get Signature

> **get** **hasPairingScanner**(): `boolean`

Whether native controls and a real native scanner are both available.

##### Returns

`boolean`

True when [BrowserRemoteApp.scanAndPair](#scanandpair) can be offered.

***

### identity

#### Get Signature

> **get** **identity**(): `Readonly`\<\{ `appId`: `string`; `hostId`: `string`; \}\> \| `undefined`

Verified application and installation identity of the ready host.

##### Returns

`Readonly`\<\{ `appId`: `string`; `hostId`: `string`; \}\> \| `undefined`

Host identity while `ready`; undefined in every other phase.

***

### metadata

#### Get Signature

> **get** **metadata**(): `TMetadata` \| `undefined`

Application metadata returned by the configured capability read.

##### Returns

`TMetadata` \| `undefined`

Metadata while `ready`; undefined in every other phase, including after revocation.

***

### origin

#### Get Signature

> **get** **origin**(): `string` \| `undefined`

Exact document origin through which the ready host is reached.

##### Returns

`string` \| `undefined`

Origin while `ready`; undefined in every other phase.

***

### phase

#### Get Signature

> **get** **phase**(): [`BrowserRemoteAppPhase`](../type-aliases/BrowserRemoteAppPhase.md)

Current credential-free gate phase.

##### Returns

[`BrowserRemoteAppPhase`](../type-aliases/BrowserRemoteAppPhase.md)

Frozen phase snapshot; observe changes with [BrowserRemoteApp.subscribe](#subscribe).

***

### session

#### Get Signature

> **get** **session**(): `RemoteSession` \| `undefined`

Authorized session for the application's remote requests.

##### Returns

`RemoteSession` \| `undefined`

The ready session owned by this gate, or undefined outside `ready`. Do not dispose it directly.

## Methods

### attach()

> **attach**(): () => `void`

Register the document lifecycle: a new `pair=` fragment prepares again, `pagehide` disposes the gate and a
page restored from the back-forward cache after disposal reloads.

#### Returns

Idempotent detach function removing exactly these listeners.

() => `void`

#### Remarks

The application still destroys its own views in its own `pagehide` handling.

***

### closeConnection()

> **closeConnection**(`connectionId`): `Promise`\<`void`\>

Close one native connection view and its streams while keeping its grant.

#### Parameters

##### connectionId

`string`

Exact saved connection identifier.

#### Returns

`Promise`\<`void`\>

Completion after native cleanup.

#### Throws

Error when native control is unavailable or the close fails.

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Cancel preparation, dispose the owned session and release all observers.

#### Returns

`Promise`\<`void`\>

Idempotent completion after session cleanup; later commands reject.

#### Throws

Error when the owned session transport cannot complete its cleanup.

***

### forgetConnection()

> **forgetConnection**(`connectionId`): `Promise`\<`void`\>

Forget one saved connection's local profile and credential, independently of host revocation.

#### Parameters

##### connectionId

`string`

Exact saved connection identifier selected by the user.

#### Returns

`Promise`\<`void`\>

Completion after the durable native removal.

#### Throws

Error when native control is unavailable or the removal fails.

***

### leave()

> **leave**(): `Promise`\<`void`\>

Return a native client from a host it can no longer use by closing that host's saved connection.

#### Returns

`Promise`\<`void`\>

Completion after the native close.

#### Remarks

Closes the connection of the host this gate last made ready; the native owner then loads the
client's own start page. Without a known host or matching saved connection nothing is closed.

#### Throws

Error when native control is unavailable or the listing or close fails.

***

### listConnections()

> **listConnections**(): `Promise`\<readonly `Readonly`\<\{ `endpoints`: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]; `id`: `string`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `label`: `string`; `selectedEndpointId`: `string`; \}\>[]\>

List the native client's saved connections of this application.

#### Returns

`Promise`\<readonly `Readonly`\<\{ `endpoints`: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]; `id`: `string`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `label`: `string`; `selectedEndpointId`: `string`; \}\>[]\>

At most one hundred validated credential-free profiles.

#### Throws

Error when native control is unavailable or disposed, or a profile is invalid or foreign.

***

### openConnection()

> **openConnection**(`profile`): `Promise`\<`void`\>

Open exactly the selected saved connection and move to its protected loopback view.

#### Parameters

##### profile

`IRemoteSavedConnection`

Saved profile previously listed by this gate, never an arbitrary destination.

#### Returns

`Promise`\<`void`\>

Completion after native activation and navigation.

#### Throws

Error for an invalid or foreign profile, unavailable native control or a failed activation.

***

### pair()

> **pair**(`address`, `deviceName`): `Promise`\<`void`\>

Pair a copied invitation address.

#### Parameters

##### address

`string`

Complete pairing URL on a private network address of this application.

##### deviceName

`string`

User-chosen label for native pairing, trimmed before use.

#### Returns

`Promise`\<`void`\>

Completion after the navigation, same-page preparation or native activation.

#### Remarks

Without native controls the browser opens the address; a link to this same page changes only its
fragment, so the gate prepares again and pairs with the configured browser device label. With native controls
the native runtime pairs and the document moves to the returned protected loopback view.

#### Throws

Error for a malformed, foreign, non-private or expired invitation, after disposal, or when native
pairing or local-view validation fails.

***

### prepare()

> **prepare**(): `Promise`\<[`BrowserRemoteAppPhase`](../type-aliases/BrowserRemoteAppPhase.md)\>

Classify this start and, for a remote start, verify host, session and application metadata.

#### Returns

`Promise`\<[`BrowserRemoteAppPhase`](../type-aliases/BrowserRemoteAppPhase.md)\>

The resulting phase; failures are published as actionable phases rather than rejections.

#### Remarks

Simultaneous calls share one preparation. Local origins and native clients outside their protected
loopback view start normally without a probe. A deadline expiry publishes `error` with reason `connection`.

#### Throws

Error after disposal.

***

### recheckAuthorization()

> **recheckAuthorization**(): `Promise`\<`void`\>

Revalidate the device session after an application request reported missing authorization.

#### Returns

`Promise`\<`void`\>

Completion of the shared revalidation; failures are absorbed into the session state.

#### Remarks

Confirmed revocation publishes `pairing-required`; the failed application request is not replayed.
Simultaneous calls share one revalidation; outside `ready` nothing happens.

***

### scanAndPair()

> **scanAndPair**(`deviceName`): `Promise`\<`void`\>

Scan one invitation with the native scanner and pair it in the native runtime.

#### Parameters

##### deviceName

`string`

User-chosen device label bound to the native pairing attempt, trimmed before use.

#### Returns

`Promise`\<`void`\>

Completion after the protected loopback view is activated.

#### Throws

Error when scanning is unavailable, cancelled or denied, the invitation is invalid, foreign or
expired, or native pairing or activation fails.

***

### subscribe()

> **subscribe**(`listener`): () => `void`

Observe phase transitions, receiving the current phase immediately.

#### Parameters

##### listener

(`phase`) => `void`

Synchronous observer owned by the caller.

#### Returns

Idempotent unsubscribe function.

() => `void`

#### Remarks

Identity, origin, metadata and session already describe the published phase when a listener runs.
Listener exceptions are isolated and forwarded to the optional observer error sink.
