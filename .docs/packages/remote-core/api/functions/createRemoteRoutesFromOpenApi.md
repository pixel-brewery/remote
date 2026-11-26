# Function: createRemoteRoutesFromOpenApi()

> **createRemoteRoutesFromOpenApi**(`document`, `policy`): readonly `IRemoteRouteDefinition`[]

Derives explicit remote route registrations from an application's actual OpenAPI contract.

## Parameters

### document

[`IRemoteOpenApiDocument`](../interfaces/IRemoteOpenApiDocument.md)

Structural OpenAPI 3 document whose `paths` are read; references are not resolved.

### policy

[`IRemoteOpenApiRoutePolicy`](../interfaces/IRemoteOpenApiRoutePolicy.md)

Application-owned prefixes, capabilities and request quotas selecting remote operations.

## Returns

readonly `IRemoteRouteDefinition`[]

A frozen array of frozen route definitions; empty when no operation is admitted.

## Remarks

The policy is an allowlist: only operations below an included prefix and
outside every excluded prefix are admitted, and methods other than GET, HEAD,
POST, PUT, PATCH and DELETE are ignored. GET and HEAD require the read
capability and may be retried as safe reads; every other method requires the
write capability and is never replayed. An operation with an inline
`text/event-stream` response becomes an `sse` route and is never retried.
Complete `{name}` template segments become `:name` parameters; partial,
duplicate or colon-prefixed literal segments are rejected. Each operation's
`operationId` becomes the route identifier and must be unique. Every route
carries an explicit request quota: the longest matching per-prefix limit or
the policy default of 4 MiB. The complete result is validated by
[RemoteRouteRegistry](../classes/RemoteRouteRegistry.md), so reserved SDK paths and overlapping patterns
fail. Routes keep the document's path order and GET, HEAD, POST, PUT, PATCH,
DELETE method order. Derivation performs no I/O and starts no listener.

## Throws

RemoteProtocolError with `invalid-request` for an invalid policy, malformed operation metadata,
a missing, oversized or duplicate operation identifier, an unsupported path parameter, or a route set
that the route registry rejects.

## Example

```ts
const routes = createRemoteRoutesFromOpenApi(openApiDocument, {
    include: ['/api/documents'],
    exclude: ['/api/documents/export'],
    readCapability: 'documents:read',
    writeCapability: 'documents:write',
    requestLimits: [{ prefix: '/api/documents/uploads', maxRequestBytes: 16777216 }],
});
```
