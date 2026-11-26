# Interface: IRemoteElectronMainOptions

Main process composes its existing IPC, Utility port and exact trusted renderer policy.

## Properties

### activateView

> `readonly` **activateView**: (`activation`, `event`) => `Promise`\<`void`\>

Install the private local capability and open the owned view before returning a public descriptor.

#### Parameters

##### activation

[`IRemoteElectronActivation`](IRemoteElectronActivation.md)

##### event

`IpcMainInvokeEvent`

#### Returns

`Promise`\<`void`\>

***

### appId

> `readonly` **appId**: `string`

Immutable product namespace checked in Main before pairing or activating a Utility response.

***

### isTrustedSender

> `readonly` **isTrustedSender**: (`event`) => `boolean`

Inspect the real Electron event, never caller-supplied sender fields.

#### Parameters

##### event

`IpcMainInvokeEvent`

#### Returns

`boolean`

***

### runtime

> `readonly` **runtime**: [`IRemoteElectronRuntime`](IRemoteElectronRuntime.md)

Narrow typed proxy to the application's network-owning Utility Process.
