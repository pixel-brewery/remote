# Function: createRemoteNativeRouteSources()

> **createRemoteNativeRouteSources**(`routes`, `options`): [`IRemoteNativeRouteSources`](../interfaces/IRemoteNativeRouteSources.md)

Emits one canonical route inventory as JSON, Kotlin and Swift source text.

## Parameters

### routes

readonly `IRemoteRouteDefinition`[]

Complete product route set, typically from [createRemoteRoutesFromOpenApi](createRemoteRoutesFromOpenApi.md).

### options

[`IRemoteNativeRouteSourceOptions`](../interfaces/IRemoteNativeRouteSourceOptions.md)

Application namespace, protocol version and native declaration names.

## Returns

[`IRemoteNativeRouteSources`](../interfaces/IRemoteNativeRouteSources.md)

Frozen JSON, Kotlin and Swift source strings, each ending with a newline.

## Remarks

The routes are validated and canonicalized through [RemoteRouteRegistry](../classes/RemoteRouteRegistry.md)
and sorted by path, method and identifier using code-unit order, so the output
is independent of input order. Kotlin and Swift construct the remote-capacitor
`RemoteNativeConfiguration.Route` values with an explicit `maxRequestBytes`;
the native SDKs accept at most 64 MiB. String literals escape quotes,
backslashes, control and line-separator characters, and Kotlin `$` templates.
Generation is pure: it writes no file and starts no runtime.

## Throws

RemoteProtocolError with `invalid-request` for an empty or registry-inadmissible route set, a route
without an explicit request quota or above the native 64 MiB limit, an invalid application namespace,
protocol version or native identifier.

## Example

```ts
const sources = createRemoteNativeRouteSources(routes, {
    appId: 'com.example.product',
    kotlin: { packageName: 'com.example.product.remote', objectName: 'ProductRemoteRoutes' },
    swift: { typeName: 'ProductRemoteRoutes' },
});
```
