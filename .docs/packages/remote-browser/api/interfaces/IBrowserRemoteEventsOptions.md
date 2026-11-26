# Interface: IBrowserRemoteEventsOptions

Same-origin WebSocket lifecycle supplied by the application.

## Properties

### clock

> `readonly` **clock**: `IRemoteClientClock`

Scheduler used for bounded recovery.

***

### createSocket

> `readonly` **createSocket**: (`url`) => `WebSocket`

WebSocket factory without bearer credentials in its URL.

#### Parameters

##### url

`string`

#### Returns

`WebSocket`

***

### maxMessageBytes?

> `readonly` `optional` **maxMessageBytes?**: `number`

Default maximum message size is 65536 bytes.

***

### onMessage

> `readonly` **onMessage**: (`data`) => `void`

Product-owned wire validation receives each bounded message.

#### Parameters

##### data

`string` \| `ArrayBuffer`

#### Returns

`void`

***

### onReconcile

> `readonly` **onReconcile**: () => `void`

Re-read current domain state after every reconnect.

#### Returns

`void`

***

### origin

> `readonly` **origin**: `string`

Current browser or protected local gateway origin.

***

### path

> `readonly` **path**: `string`

Registered product event path.

***

### retryLimit?

> `readonly` `optional` **retryLimit?**: `number`

Default maximum reconnection attempts is eight.
