# Interface: IRemoteNativeRouteSources

Generated route inventories sharing one canonical, deterministically ordered route set.

## Remarks

Every string ends with a newline. Writing the files, choosing their locations
and checking them for drift remain the application's build responsibility.

## Properties

### json

> `readonly` **json**: `string`

JSON document `{ appId, protocolVersion, routes }` for web clients and gateways.

***

### kotlin

> `readonly` **kotlin**: `string`

Kotlin source constructing `RemoteNativeConfiguration.Route` values for the Android SDK.

***

### swift

> `readonly` **swift**: `string`

Swift source constructing `RemoteNativeConfiguration.Route` values for the iOS SDK.
