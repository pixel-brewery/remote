# Class: NodeHttpsLanTransport

TLS listener consuming an application-owned certificate provider.

## Implements

- [`IRemoteNodeTransport`](../interfaces/IRemoteNodeTransport.md)

## Constructors

### Constructor

> **new NodeHttpsLanTransport**(`_provider`): `NodeHttpsLanTransport`

Binds issuance-independent TLS material.

#### Parameters

##### \_provider

[`IRemoteTlsProvider`](../interfaces/IRemoteTlsProvider.md)

Application-owned certificate material and renewal port.

#### Returns

`NodeHttpsLanTransport`

## Properties

### id

> `readonly` **id**: `"lan-https"` = `'lan-https'`

Stable connector identifier.

#### Implementation of

[`IRemoteNodeTransport`](../interfaces/IRemoteNodeTransport.md).[`id`](../interfaces/IRemoteNodeTransport.md#id)

***

### scheme

> `readonly` **scheme**: `"https"`

Listener protocol.

#### Implementation of

[`IRemoteNodeTransport`](../interfaces/IRemoteNodeTransport.md).[`scheme`](../interfaces/IRemoteNodeTransport.md#scheme)

## Methods

### create()

> **create**(`listener`): `Promise`\<`Server`\<*typeof* `IncomingMessage`, *typeof* `ServerResponse`\>\>

Creates an unbound TLS server and activates renewed material in place.

#### Parameters

##### listener

`RequestListener`

Original HTTP request dispatcher supplied by the owning host.

#### Returns

`Promise`\<`Server`\<*typeof* `IncomingMessage`, *typeof* `ServerResponse`\>\>

The unbound server. The caller must bind and close it through its owning lifecycle.

#### Implementation of

[`IRemoteNodeTransport`](../interfaces/IRemoteNodeTransport.md).[`create`](../interfaces/IRemoteNodeTransport.md#create)
