# Class: NodeRemoteConnector

Opens one explicitly selected numeric private peer; no DNS, redirects or peer discovery is performed.

## Implements

- `IRemoteConnector`

## Constructors

### Constructor

> **new NodeRemoteConnector**(`_options`): `NodeRemoteConnector`

Binds app-owned identity, routes, credential storage and certificate trust.

#### Parameters

##### \_options

[`INodeRemoteConnectorOptions`](../interfaces/INodeRemoteConnectorOptions.md)

Application-owned composition, routes and runtime limits for this owner.

#### Returns

`NodeRemoteConnector`

## Properties

### id

> `readonly` **id**: `string`

Endpoint transport understood by this connector.

#### Implementation of

`IRemoteConnector.id`

## Methods

### connect()

> **connect**(`input`, `signal`): `Promise`\<[`NodeRemoteClientTransport`](NodeRemoteClientTransport.md)\>

Validates the private destination and verifies its identity before loading any credential.

#### Parameters

##### input

`IRemoteEndpoint`

Untrusted input validated by the canonical contract before use.

##### signal

`AbortSignal`

Cancellation signal for this operation; cancellation never rolls back an application mutation already admitted by the host.

#### Returns

`Promise`\<[`NodeRemoteClientTransport`](NodeRemoteClientTransport.md)\>

An owned transport whose public host identity has been verified before credential restoration.

#### Remarks

The connector permits only explicit numeric private peers and never follows redirects. The loopback exception is for tests only.

#### Throws

RemoteProtocolError for a disallowed peer, cancellation, protocol incompatibility or network failure.

#### Implementation of

`IRemoteConnector.connect`
