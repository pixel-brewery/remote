# Interface: IRemoteOpenApiDocument

Minimal structural view of an OpenAPI 3 document used to derive remote routes.

## Remarks

Only `paths` is read. Generated documents from any framework are accepted
structurally; no OpenAPI library is required. References are not resolved.

## Properties

### paths

> `readonly` **paths**: `Readonly`\<`Record`\<`string`, [`IRemoteOpenApiPathItem`](IRemoteOpenApiPathItem.md) \| `undefined`\>\>

OpenAPI path templates such as `/api/items/{id}`, mapped to their operations.
