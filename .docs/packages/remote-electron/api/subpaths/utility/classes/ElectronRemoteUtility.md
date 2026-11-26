# Class: ElectronRemoteUtility

Utility-owned native remote channel and authenticated packaged-content gateway.

## Remarks

The application supplies a Main-mediated credential port. No plaintext secret or private gateway cookie is sent to renderer JS.

## Constructors

### Constructor

> **new ElectronRemoteUtility**(`_options`): `ElectronRemoteUtility`

Compose immutable application-owned policy and runtime ports.

#### Parameters

##### \_options

[`IRemoteElectronUtilityOptions`](../interfaces/IRemoteElectronUtilityOptions.md)

Product identity, packaged assets, registered routes and private persistence.

#### Returns

`ElectronRemoteUtility`

## Methods

### closeConnection()

> **closeConnection**(`connectionId`): `Promise`\<`void`\>

Cancel one selected view without deleting its persistent grant.

#### Parameters

##### connectionId

`string`

Active view identifier; other identifiers leave it running.

#### Returns

`Promise`\<`void`\>

Network and gateway cleanup completion.

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Cancel every owned socket, local view and pending pairing during Utility shutdown.

#### Returns

`Promise`\<`void`\>

Idempotent cleanup completion.

***

### forgetConnection()

> **forgetConnection**(`connectionId`): `Promise`\<`void`\>

Remove one local profile and Main-mediated credential.

#### Parameters

##### connectionId

`string`

Exact stored profile to forget.

#### Returns

`Promise`\<`void`\>

Durable metadata update after cancellation of that profile's streams.

***

### listConnections()

> **listConnections**(): `Promise`\<readonly `IRemoteSavedConnection`[]\>

Read safe profile metadata without decrypting credentials.

#### Returns

`Promise`\<readonly `IRemoteSavedConnection`[]\>

Validated profiles limited to this application's namespace.

#### Throws

Error if persistence contains another application's identity.

***

### openConnection()

> **openConnection**(`connectionId`): `Promise`\<`IRemoteLocalGatewayView`\>

Restore a saved host and start its isolated authenticated loopback view.

#### Parameters

##### connectionId

`string`

Exact selected safe-profile identifier.

#### Returns

`Promise`\<`IRemoteLocalGatewayView`\>

Main-only activation descriptor after public host identity and session validation.

#### Throws

Error when a profile is absent, revoked or unreachable.

***

### pair()

> **pair**(`bootstrap`, `deviceName`): `Promise`\<`IRemoteLocalGatewayView`\>

Complete a native bearer pairing, save its safe profile and activate packaged content.

#### Parameters

##### bootstrap

`IRemotePairingBootstrap`

Unexpired invitation for the immutable product namespace.

##### deviceName

`string`

User-selected device label; stable across recovery of one attempt.

#### Returns

`Promise`\<`IRemoteLocalGatewayView`\>

Privileged activation descriptor for Main, including its private local cookie.

#### Throws

Error when host approval is pending, storage fails or verified identities mismatch.
