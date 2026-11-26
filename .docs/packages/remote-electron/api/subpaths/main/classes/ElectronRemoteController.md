# Class: ElectronRemoteController

Main IPC router validates real sender authority and strips private gateway activation fields.

## Remarks

Main performs credential mediation and view activation; network work stays behind the Utility proxy.

## Constructors

### Constructor

> **new ElectronRemoteController**(`_options`): `ElectronRemoteController`

Compose an existing application IPC and Utility boundary.

#### Parameters

##### \_options

[`IRemoteElectronMainOptions`](../interfaces/IRemoteElectronMainOptions.md)

Trusted sender predicate, typed Utility proxy and native cookie installer.

#### Returns

`ElectronRemoteController`

## Methods

### handle()

> **handle**(`event`, `raw`): `Promise`\<`Readonly`\<\{ `connections`: readonly `Readonly`\<\{ `endpoints`: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]; `id`: `string`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `label`: `string`; `selectedEndpointId`: `string`; \}\>[]; `kind`: `"connections"`; \}\> \| `Readonly`\<\{ `kind`: `"view"`; `view`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `connectionId`: `z.ZodString`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `origin`: `z.ZodURL`; \}, `z.core.$strict`\>\>; \}\> \| `Readonly`\<\{ `kind`: `"done"`; \}\>\>

Handle one fixed-channel invocation after validating its actual Electron event.

#### Parameters

##### event

`IpcMainInvokeEvent`

Main-provided invocation event, never serialized sender data from JS.

##### raw

`unknown`

Untrusted canonical control request.

#### Returns

`Promise`\<`Readonly`\<\{ `connections`: readonly `Readonly`\<\{ `endpoints`: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]; `id`: `string`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `label`: `string`; `selectedEndpointId`: `string`; \}\>[]; `kind`: `"connections"`; \}\> \| `Readonly`\<\{ `kind`: `"view"`; `view`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `connectionId`: `z.ZodString`; `identity`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>; `origin`: `z.ZodURL`; \}, `z.core.$strict`\>\>; \}\> \| `Readonly`\<\{ `kind`: `"done"`; \}\>\>

Safe schema-validated response with no gateway cookie or remote bearer credential.

#### Throws

Error for subframes, untrusted senders or invalid control operations.
