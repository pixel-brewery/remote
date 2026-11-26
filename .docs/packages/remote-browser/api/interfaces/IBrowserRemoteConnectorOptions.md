# Interface: IBrowserRemoteConnectorOptions

Explicit browser globals make the adapter import-safe and independently testable.

## Properties

### fetch

> `readonly` **fetch**: (`input`, `init?`) => `Promise`\<`Response`\>

Host-bound browser fetch.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

#### Parameters

##### input

`RequestInfo` \| `URL`

##### init?

`RequestInit`

#### Returns

`Promise`\<`Response`\>

***

### maximumBufferedRequestBytes?

> `readonly` `optional` **maximumBufferedRequestBytes?**: `number`

Maximum buffered HTTP/1 request payload, default 8388608 bytes. Exceeding it fails before dispatch.
Native form/File uploads can use their normal same-origin browser APIs through the registered gateway.

***

### origin

> `readonly` **origin**: `string`

Current document origin. Cross-origin credential forwarding is not supported.

***

### protocolResponseBytes?

> `readonly` `optional` **protocolResponseBytes?**: `number`

Bound on SDK JSON responses, not product streams; defaults to 65536 bytes.

***

### requestBodyMode?

> `readonly` `optional` **requestBodyMode?**: `"buffered-http1"` \| `"streaming-fetch"`

Request upload strategy chosen before dispatch. Defaults to buffered-http1 for LAN and loopback compatibility.
streaming-fetch requires a browser/server combination supporting Fetch upload streams over HTTP/2 or HTTP/3.

***

### transportId?

> `readonly` `optional` **transportId?**: `string`

Defaults to lan-http or lan-https according to the origin.
