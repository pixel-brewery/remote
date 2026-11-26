# Interface: IRemoteNativeRouteSourceOptions

Application-owned names used to emit route inventories for browser and native clients.

## Remarks

Every name is validated as a plain identifier before it is written into source
text, so generated files cannot contain injected declarations.

## Properties

### appId

> `readonly` **appId**: `string`

Application namespace written into the JSON inventory; lowercase letter first, then letters, digits, dots or hyphens, at most 80 characters.

***

### kotlin

> `readonly` **kotlin**: `object`

Android target declaring a Kotlin `object` with a `routes` list of `RemoteNativeConfiguration.Route` values.

#### objectName

> `readonly` **objectName**: `string`

Kotlin identifier of the generated internal object.

#### packageName

> `readonly` **packageName**: `string`

Dot-separated Kotlin package of the generated file, for example `com.example.product.remote`.

***

### protocolVersion?

> `readonly` `optional` **protocolVersion?**: `number`

Protocol major version written into the JSON inventory; defaults to the current remote protocol version.

***

### swift

> `readonly` **swift**: `object`

iOS target declaring a Swift `enum` whose throwing `make()` returns `RemoteNativeConfiguration.Route` values.

#### typeName

> `readonly` **typeName**: `string`

Swift identifier of the generated internal enum.
