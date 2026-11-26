# Interface: IRemoteHostControlClientOptions

Explicit browser ports and bounds for an application's private local host-control endpoint.

## Remarks

The endpoint belongs to the application, which serves it only to its own local host view.
The client adds no authority: the application's endpoint authorizes every command itself.

## Properties

### fetch

> `readonly` **fetch**: (`input`, `init?`) => `Promise`\<`Response`\>

Bound browser fetch, for example `window.fetch.bind(window)`. Requests use same-origin credentials,
refuse redirects and bypass the HTTP cache.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

#### Parameters

##### input

`RequestInfo` \| `URL`

##### init?

`RequestInit`

#### Returns

`Promise`\<`Response`\>

***

### isAvailable?

> `readonly` `optional` **isAvailable?**: () => `boolean`

Optional synchronous guard evaluated before every dispatch, for example an exact local-origin check.
A false result rejects with code `unavailable` and sends nothing. Omission always permits dispatch.

#### Returns

`boolean`

***

### maxResponseBytes?

> `readonly` `optional` **maxResponseBytes?**: `number`

Maximum accepted response body in bytes; defaults to 262144 (256 KiB).

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Same-origin absolute path prefix of the control routes, without a trailing slash, query or fragment.
Defaults to `/__host/remote/v1`; commands are appended as `/status`, `/enable` and so on.

***

### timeoutMs?

> `readonly` `optional` **timeoutMs?**: `number`

Per-command deadline in milliseconds covering headers and body; defaults to 15000.
