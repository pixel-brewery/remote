# Interface: IRemoteHostControlOptions

Path and body bounds of the private host-control HTTP endpoint.

## Properties

### maxBodyBytes?

> `readonly` `optional` **maxBodyBytes?**: `number`

Maximum declared or streamed JSON body bytes, default 2048, between 2 and 65536.

***

### prefix?

> `readonly` `optional` **prefix?**: `string`

Exact command prefix without trailing slash, default `/__host/remote/v1`; commands are `<prefix>/<command>`.
