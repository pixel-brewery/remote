# Interface: IRemoteConnector

Runtime-specific connection factory; it performs no work when imported.

## Properties

### id

> `readonly` **id**: `string`

Stable transport identifier, for example lan-http.

## Methods

### connect()

> **connect**(`endpoint`, `signal`): `Promise`\<[`IRemoteClientTransport`](IRemoteClientTransport.md)\>

Open a channel to exactly the selected endpoint.

#### Parameters

##### endpoint

`IRemoteEndpoint`

One explicitly selected host endpoint.

##### signal

`AbortSignal`

Cancellation signal owned by the calling lifecycle.

#### Returns

`Promise`\<[`IRemoteClientTransport`](IRemoteClientTransport.md)\>

Owned transport bound to exactly the selected endpoint.
