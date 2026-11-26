# Interface: IRemoteRouteDefinition

Explicit product route admission. Routes never grant arbitrary method dispatch.

## Properties

### capabilities

> `readonly` **capabilities**: readonly `string`[]

Every named capability required by this operation. An empty set admits any paired device; product resource checks remain application-owned.

***

### id

> `readonly` **id**: `string`

Stable identifier within the owning collection.

***

### kind

> `readonly` **kind**: `"http"` \| `"sse"` \| `"websocket"`

Transport mode used by this registered operation.

***

### maxRequestBytes?

> `readonly` `optional` **maxRequestBytes?**: `number`

Maximum consumed request-body bytes. Adapters default to 4 MiB when omitted.

***

### method

> `readonly` **method**: `"GET"` \| `"HEAD"` \| `"POST"` \| `"PUT"` \| `"PATCH"` \| `"DELETE"`

Exact admitted HTTP method. The transport does not reinterpret or replay writes.

***

### path

> `readonly` **path**: `string`

Origin-form relative path. Complete colon-prefixed segments in route definitions match one parameter.

***

### retry

> `readonly` **retry**: `"never"` \| `"safe-read"`

Only safe-read routes may be retried by an explicit caller policy. Mutation replay is never automatic.
