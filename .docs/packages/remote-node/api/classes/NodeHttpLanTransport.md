# Class: NodeHttpLanTransport

Explicit unencrypted LAN listener. It never silently substitutes for a failed TLS listener.

## Implements

- [`IRemoteNodeTransport`](../interfaces/IRemoteNodeTransport.md)

## Constructors

### Constructor

> **new NodeHttpLanTransport**(): `NodeHttpLanTransport`

#### Returns

`NodeHttpLanTransport`

## Properties

### id

> `readonly` **id**: `"lan-http"` = `'lan-http'`

Stable connector identifier.

#### Implementation of

[`IRemoteNodeTransport`](../interfaces/IRemoteNodeTransport.md).[`id`](../interfaces/IRemoteNodeTransport.md#id)

***

### scheme

> `readonly` **scheme**: `"http"`

Listener protocol.

#### Implementation of

[`IRemoteNodeTransport`](../interfaces/IRemoteNodeTransport.md).[`scheme`](../interfaces/IRemoteNodeTransport.md#scheme)

## Methods

### create()

> **create**(`listener`): `Promise`\<`Server`\<*typeof* `IncomingMessage`, *typeof* `ServerResponse`\>\>

Creates an unbound HTTP server.

#### Parameters

##### listener

`RequestListener`

Original HTTP request dispatcher supplied by the owning host.

#### Returns

`Promise`\<`Server`\<*typeof* `IncomingMessage`, *typeof* `ServerResponse`\>\>

The unbound server. The caller must bind and close it through its owning lifecycle.

#### Implementation of

[`IRemoteNodeTransport`](../interfaces/IRemoteNodeTransport.md).[`create`](../interfaces/IRemoteNodeTransport.md#create)
