# Interface: IRemoteOpenApiPathItem

Operations of one OpenAPI path template, restricted to the methods remote routes can admit.

## Remarks

Other path-item members such as `parameters`, `options` or `trace` are ignored;
they never become remote operations.

## Properties

### delete?

> `readonly` `optional` **delete?**: [`IRemoteOpenApiOperation`](IRemoteOpenApiOperation.md)

Optional DELETE operation; derived routes are writes that are never replayed.

***

### get?

> `readonly` `optional` **get?**: [`IRemoteOpenApiOperation`](IRemoteOpenApiOperation.md)

Optional GET operation; derived routes are reads that may be retried as safe reads.

***

### head?

> `readonly` `optional` **head?**: [`IRemoteOpenApiOperation`](IRemoteOpenApiOperation.md)

Optional HEAD operation; derived routes are reads that may be retried as safe reads.

***

### patch?

> `readonly` `optional` **patch?**: [`IRemoteOpenApiOperation`](IRemoteOpenApiOperation.md)

Optional PATCH operation; derived routes are writes that are never replayed.

***

### post?

> `readonly` `optional` **post?**: [`IRemoteOpenApiOperation`](IRemoteOpenApiOperation.md)

Optional POST operation; derived routes are writes that are never replayed.

***

### put?

> `readonly` `optional` **put?**: [`IRemoteOpenApiOperation`](IRemoteOpenApiOperation.md)

Optional PUT operation; derived routes are writes that are never replayed.
