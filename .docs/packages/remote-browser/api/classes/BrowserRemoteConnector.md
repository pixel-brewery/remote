# Class: BrowserRemoteConnector

Same-origin cookie connector with bounded protocol JSON and streamed product bodies.

## Remarks

Bearer credentials never enter browser state. Dispose aborts both pending headers and bodies.

## Implements

- `IRemoteConnector`

## Constructors

### Constructor

> **new BrowserRemoteConnector**(`_options`): `BrowserRemoteConnector`

Construct without fetching or touching browser globals.

#### Parameters

##### \_options

[`IBrowserRemoteConnectorOptions`](../interfaces/IBrowserRemoteConnectorOptions.md)

Exact current origin, bound browser fetch and protocol byte limit.

#### Returns

`BrowserRemoteConnector`

#### Throws

Error for credentials, paths or unsupported schemes in the origin.

## Properties

### id

> `readonly` **id**: `string`

Selected transport family, inferred from HTTP or HTTPS unless configured.

#### Implementation of

`IRemoteConnector.id`

## Methods

### connect()

> **connect**(`endpoint`, `signal`): `Promise`\<`IRemoteClientTransport`\>

Create an owned channel to this document's origin only.

#### Parameters

##### endpoint

`IRemoteEndpoint`

Selected endpoint matching origin and transport identifier.

##### signal

`AbortSignal`

Channel lifetime cancellation, retained until disposal.

#### Returns

`Promise`\<`IRemoteClientTransport`\>

A credential-free transport whose protocol responses are schema validated.

#### Throws

Error for another origin, transport or an already aborted signal.

#### Implementation of

`IRemoteConnector.connect`
