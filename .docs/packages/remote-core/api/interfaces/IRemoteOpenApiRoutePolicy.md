# Interface: IRemoteOpenApiRoutePolicy

Application-owned allowlist that turns selected OpenAPI operations into remote routes.

## Remarks

Appearing in the document never makes an operation remote by itself: only
operations below an included prefix and outside every excluded prefix are
admitted. Prefixes match complete path segments of the OpenAPI template, so
`/api/items` admits `/api/items` and `/api/items/{id}` but not `/api/itemsets`.
Product resource authorization still runs in the application after admission.

## Properties

### exclude?

> `readonly` `optional` **exclude?**: readonly `string`[]

Optional prefixes withheld from remote access even when an included prefix covers them.

***

### include

> `readonly` **include**: readonly `string`[]

Admitted OpenAPI path prefixes; at least one is required.

***

### maxRequestBytes?

> `readonly` `optional` **maxRequestBytes?**: `number`

Default request-body quota in bytes for derived routes; defaults to 4 MiB (4194304).

***

### readCapability

> `readonly` **readCapability**: `string`

Capability required by every derived GET and HEAD route.

***

### requestLimits?

> `readonly` `optional` **requestLimits?**: readonly [`IRemoteOpenApiRequestLimit`](IRemoteOpenApiRequestLimit.md)[]

Optional per-prefix quotas overriding the default; the longest matching prefix wins.

***

### writeCapability

> `readonly` **writeCapability**: `string`

Capability required by every derived POST, PUT, PATCH and DELETE route.
