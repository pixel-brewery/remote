# Interface: IElectronRemoteUtilityProcessOptions

Application composition of the network-owning Utility Process started by `startElectronRemoteUtility`.

## Remarks

These values are compiled into the application's own Utility entry. Main supplies only
the absolute asset and storage paths at initialization; no value comes from renderer code.

## Properties

### appId

> `readonly` **appId**: `string`

Canonical lowercase application namespace. Initialization fails when Main announces another one.

***

### contentPolicy?

> `readonly` `optional` **contentPolicy?**: `Readonly`\<`Readonly`\<\{ `allowHttpsConnections?`: `boolean`; `allowHttpsImages?`: `boolean`; `allowHttpsMedia?`: `boolean`; \}\>\>

App-owned HTTPS resource permissions of the packaged UI; every flag defaults to false.

#### Remarks

This never adds remote proxy routes, scripts, frames or navigation.

***

### credentialTimeoutMs?

> `readonly` `optional` **credentialTimeoutMs?**: `number`

Milliseconds one credential request may wait for Main's OS vault. Defaults to 15000.

## Methods

### createProfileStore()?

> `optional` **createProfileStore**(`storageDirectory`): `IRemoteProfileStore`

Create the safe profile store below the storage directory announced by Main.

#### Parameters

##### storageDirectory

`string`

Absolute application-private directory.

#### Returns

`IRemoteProfileStore`

Store of credential-free profiles. Defaults to a `JsonRemoteProfileStore` at
`profiles.json` in that directory.

***

### loadRoutes()

> **loadRoutes**(`assetsPath`): `Promise`\<readonly `IRemoteRouteDefinition`[]\>

Load the application's registered operation inventory once during initialization.

#### Parameters

##### assetsPath

`string`

Absolute packaged UI directory announced by Main, for inventories generated
next to the packaged assets.

#### Returns

`Promise`\<readonly `IRemoteRouteDefinition`[]\>

Routes the gateway and upstream transport admit; the canonical route registry validates
them before any connection opens.

#### Throws

Any error to fail initialization; Main then stops the Utility Process.
