# Class: BrowserRemoteEvents

Owns one same-origin bounded WebSocket and explicit read-reconciliation callbacks.

## Remarks

This lifecycle never queues or resends application messages.

## Constructors

### Constructor

> **new BrowserRemoteEvents**(`_options`): `BrowserRemoteEvents`

Compose a socket factory and deterministic scheduler.

#### Parameters

##### \_options

[`IBrowserRemoteEventsOptions`](../interfaces/IBrowserRemoteEventsOptions.md)

Same-origin path, byte/retry bounds and product event observers.

#### Returns

`BrowserRemoteEvents`

#### Throws

Error for unsupported origins, relative-path escapes or invalid limits.

## Methods

### connect()

> **connect**(): `void`

Open once; subsequent calls retain an existing socket.

#### Returns

`void`

#### Throws

Error after permanent disposal.

***

### dispose()

> **dispose**(): `void`

Close the socket and pending reconnect timer permanently.

#### Returns

`void`
