# Interface: IRemoteElectronUtilityOptions

Privileged Utility Process composition; no value is accepted from renderer configuration.

## Properties

### allowLoopbackForTests?

> `readonly` `optional` **allowLoopbackForTests?**: `boolean`

Test-only explicit loopback upstream acceptance.

***

### appId

> `readonly` **appId**: `string`

Immutable product namespace.

***

### assetsPath

> `readonly` **assetsPath**: `string`

Immutable packaged UI directory.

***

### contentPolicy?

> `readonly` `optional` **contentPolicy?**: `Readonly`\<`Readonly`\<\{ `allowHttpsConnections?`: `boolean`; `allowHttpsImages?`: `boolean`; `allowHttpsMedia?`: `boolean`; \}\>\>

App-owned HTTPS resource permissions for trusted packaged UI; every flag defaults to false.

#### Remarks

This never expands remote proxy routes, scripts, frames or navigation.

***

### credentialStore

> `readonly` **credentialStore**: `IRemoteCredentialStore`

Narrow Main-mediated credential vault port.

***

### profileStore

> `readonly` **profileStore**: `IRemoteProfileStore`

App-owned safe profile store.

***

### routes

> `readonly` **routes**: readonly `IRemoteRouteDefinition`[]

Explicit product operation registry.
