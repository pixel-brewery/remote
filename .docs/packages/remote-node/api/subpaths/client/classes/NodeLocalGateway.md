# Class: NodeLocalGateway

Loopback-only view server. Native assets execute locally; admitted application bytes flow to one owned peer.

## Constructors

### Constructor

> **new NodeLocalGateway**(`_options`): `NodeLocalGateway`

Composes a packaged view with a privileged transport. No listener or file access starts here.

#### Parameters

##### \_options

[`INodeLocalGatewayOptions`](../interfaces/INodeLocalGatewayOptions.md)

Application-owned composition, routes and runtime limits for this owner.

#### Returns

`NodeLocalGateway`

## Methods

### dispose()

> **dispose**(): `Promise`\<`void`\>

Cancels forwarding, closes local views and releases all sockets. It does not revoke the device.

#### Returns

`Promise`\<`void`\>

Resolves after owned resources close. Repeated calls do not create additional work.

***

### start()

> **start**(): `Promise`\<[`IRemoteLocalGatewayView`](../interfaces/IRemoteLocalGatewayView.md)\>

Starts one ephemeral IPv4 loopback listener and returns a native-only cookie installation descriptor.

#### Returns

`Promise`\<[`IRemoteLocalGatewayView`](../interfaces/IRemoteLocalGatewayView.md)\>

The native-only local-view descriptor. Install its cookie before navigating and omit the cookie from renderer state.

#### Remarks

Only 127.0.0.1 is bound. The cookie is a distinct ephemeral capability installed by native code, never the remote device bearer.

#### Throws

RemoteProtocolError or a filesystem error when packaged assets or the loopback listener are unavailable.
