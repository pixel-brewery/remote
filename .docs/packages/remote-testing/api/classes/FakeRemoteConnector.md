# Class: FakeRemoteConnector

Scripted connector exposing attempted endpoint selection without requiring real network I/O.

## Implements

- `IRemoteConnector`

## Constructors

### Constructor

> **new FakeRemoteConnector**(`id`, `_create`): `FakeRemoteConnector`

Supplies the transport factory so each test controls real responses and race boundaries.

#### Parameters

##### id

`string`

Transport identifier used to select this connector.

##### \_create

(`endpoint`, `signal`) => `Promise`\<`IRemoteClientTransport`\>

Scripted transport factory called once per admitted connection attempt.

#### Returns

`FakeRemoteConnector`

## Properties

### id

> `readonly` **id**: `string`

Transport identifier selected by this test connector.

#### Implementation of

`IRemoteConnector.id`

## Accessors

### connections

#### Get Signature

> **get** **connections**(): readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]

Detached endpoint attempts, in dispatch order.

##### Returns

readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]

Detached endpoint attempts in their original dispatch order.

## Methods

### connect()

> **connect**(`input`, `signal`): `Promise`\<`IRemoteClientTransport`\>

Invokes the configured factory once, rejecting already-cancelled attempts.

#### Parameters

##### input

`IRemoteEndpoint`

Untrusted input validated by the canonical contract before use.

##### signal

`AbortSignal`

Cancellation signal for this attempt. A transport returned after cancellation is disposed before the attempt rejects.

#### Returns

`Promise`\<`IRemoteClientTransport`\>

The scripted transport created for this endpoint; the test factory defines descriptor and authentication behavior.

#### Implementation of

`IRemoteConnector.connect`
