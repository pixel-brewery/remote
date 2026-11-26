# Interface: IRemoteNodeTransport

Listener factory seam. Creating an adapter does not bind a network interface.

## Properties

### id

> `readonly` **id**: `string`

Stable identifier within the owning collection.

***

### scheme

> `readonly` **scheme**: `"http"` \| `"https"`

Protocol advertised by the corresponding listener, either HTTP or HTTPS.

## Methods

### create()

> **create**(`listener`): `Promise`\<`Server`\<*typeof* `IncomingMessage`, *typeof* `ServerResponse`\>\>

Creates an unbound HTTP-compatible server for the owning host lifecycle.

#### Parameters

##### listener

`RequestListener`

Original HTTP request dispatcher supplied by the host.

#### Returns

`Promise`\<`Server`\<*typeof* `IncomingMessage`, *typeof* `ServerResponse`\>\>

An unbound listener whose binding, connections and shutdown remain host-owned.

#### Throws

An error when required application-owned TLS material cannot be loaded.
