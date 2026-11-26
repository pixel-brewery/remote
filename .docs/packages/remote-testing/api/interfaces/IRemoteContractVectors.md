# Interface: IRemoteContractVectors

Public wire examples and boundary rejection cases for independent adapter implementations.

## Properties

### bootstrap

> `readonly` **bootstrap**: `IRemotePairingBootstrap`

Fixed expired example invitation. Its challenge is fake test data.

***

### contentPolicies

> `readonly` **contentPolicies**: readonly `Readonly`\<`Readonly`\<\{ `allowHttpsConnections?`: `boolean`; `allowHttpsImages?`: `boolean`; `allowHttpsMedia?`: `boolean`; \}\>\>[]

Valid independently selectable HTTPS content permissions, including the deny-by-default empty input.

***

### host

> `readonly` **host**: `IRemoteHostDescriptor`

Credential-free descriptor for the fixed notes fixture installation.

***

### invalidContentPolicies

> `readonly` **invalidContentPolicies**: readonly `unknown`[]

Invalid content policies that attempt script permission or use non-boolean flags.

***

### invalidOrigins

> `readonly` **invalidOrigins**: readonly `string`[]

Destinations production private-LAN connectors must reject.

***

### invalidPaths

> `readonly` **invalidPaths**: readonly `string`[]

Ambiguous or foreign request targets every route boundary must reject.

***

### session

> `readonly` **session**: `IRemoteSessionDescriptor`

Authorized device projection belonging to the same fixture installation.
