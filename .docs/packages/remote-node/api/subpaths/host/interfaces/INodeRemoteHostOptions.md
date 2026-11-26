# Interface: INodeRemoteHostOptions

Explicit private host composition. No product or certificate service is embedded.

## Properties

### access

> `readonly` **access**: `RemoteAccessService`

Sanitized authorization state with neither token hashes nor plaintext credentials.

***

### allowLoopbackForTests?

> `readonly` `optional` **allowLoopbackForTests?**: `boolean`

Test-only exception for numeric loopback destinations. Production configuration must omit this flag.

***

### application

> `readonly` **application**: [`IRemoteApplicationAdapter`](IRemoteApplicationAdapter.md)

Product dispatcher retaining canonical validation, business decisions and resource authorization.

***

### assetsPath?

> `readonly` `optional` **assetsPath?**: `string`

Application-owned immutable packaged web-asset root. Symbolic links outside the canonical root are rejected.

***

### contentSecurityPolicy?

> `readonly` `optional` **contentSecurityPolicy?**: `string`

Application-owned packaged-asset content policy. The default permits only same-origin scripts and denies embedding.

***

### cookieName?

> `readonly` `optional` **cookieName?**: `string`

Optional HTTP token-safe session-cookie name; the default is scoped to the app and host identifiers.

***

### host?

> `readonly` `optional` **host?**: `string`

Optional numeric private interface address. Omission selects a supported physical private IPv4 interface; wildcard, public and DNS addresses are rejected.

***

### identity

> `readonly` **identity**: `IRemoteHostIdentity`

Application and installation namespace to which this owner belongs.

***

### maxConnections?

> `readonly` `optional` **maxConnections?**: `number`

Maximum simultaneous TCP connections. The host defaults to 128 and the local view to 64.

***

### maxWebSockets?

> `readonly` `optional` **maxWebSockets?**: `number`

Maximum active host WebSockets, default 64.

***

### name

> `readonly` **name**: `string`

Human-readable host or device label; never interpreted as authority.

***

### port?

> `readonly` `optional` **port?**: `number`

First listener port, default 49152. Zero is permitted only by the explicit test-loopback policy.

***

### portEnd?

> `readonly` `optional` **portEnd?**: `number`

Inclusive fallback port bound. The range is capped at 128 alternatives.

***

### reportFailure?

> `readonly` `optional` **reportFailure?**: (`failure`) => `void`

Optional sanitized diagnostic callback receiving operation and stable code without credentials or private payloads.

#### Parameters

##### failure

###### code

`string`

Stable protocol failure category safe to cross the process or network boundary.

###### operation

`string`

Sanitized operation category associated with the reported failure; never a URL, credential or product payload.

#### Returns

`void`

***

### routes

> `readonly` **routes**: readonly `IRemoteRouteDefinition`[]

Explicit product operation registry. SDK-reserved operations cannot be overridden and unknown methods or paths are denied.

***

### shutdownTimeoutMs?

> `readonly` `optional` **shutdownTimeoutMs?**: `number`

Maximum graceful shutdown wait before remaining sockets are destroyed, default one second.

***

### transports?

> `readonly` `optional` **transports?**: readonly [`IRemoteNodeTransport`](IRemoteNodeTransport.md)[]

Explicit listener adapters. Defaults to one unencrypted private-LAN HTTP listener.
