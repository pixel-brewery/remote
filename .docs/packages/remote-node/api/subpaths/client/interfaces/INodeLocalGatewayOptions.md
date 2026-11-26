# Interface: INodeLocalGatewayOptions

Protected local view composition; assets and route authority belong to the embedding application.

## Properties

### assetsPath

> `readonly` **assetsPath**: `string`

Application-owned immutable packaged web-asset root. Symbolic links outside the canonical root are rejected.

***

### connectionId

> `readonly` **connectionId**: `string`

Application-owned saved-connection identifier identifying this local view.

***

### contentPolicy?

> `readonly` `optional` **contentPolicy?**: `Readonly`\<`Readonly`\<\{ `allowHttpsConnections?`: `boolean`; `allowHttpsImages?`: `boolean`; `allowHttpsMedia?`: `boolean`; \}\>\>

Immutable HTTPS image/media/connection permissions for trusted packaged assets only. Every omitted flag defaults to false; scripts, frames and proxy responses remain restricted.

***

### identity

> `readonly` **identity**: `IRemoteHostIdentity`

Application and installation namespace to which this owner belongs.

***

### maxConcurrentRequests?

> `readonly` `optional` **maxConcurrentRequests?**: `number`

Maximum owned requests or local forwarding operations, default 64.

***

### maxConnections?

> `readonly` `optional` **maxConnections?**: `number`

Maximum simultaneous TCP connections. The host defaults to 128 and the local view to 64.

***

### openWebSocket?

> `readonly` `optional` **openWebSocket?**: (`path`, `signal`) => `Promise`\<`WebSocket`\>

Optional privileged event connector. Only routes registered as WebSocket operations can invoke it.

#### Parameters

##### path

`string`

##### signal

`AbortSignal`

#### Returns

`Promise`\<`WebSocket`\>

***

### routes

> `readonly` **routes**: readonly `IRemoteRouteDefinition`[]

Operations that the packaged view may forward to the already selected remote peer. No destination parameter or generic proxy route exists.

***

### shutdownTimeoutMs?

> `readonly` `optional` **shutdownTimeoutMs?**: `number`

Maximum graceful shutdown wait before remaining sockets are destroyed, default one second.

***

### transport

> `readonly` **transport**: `IRemoteClientTransport`

Privileged transport already bound to one selected verified host.
