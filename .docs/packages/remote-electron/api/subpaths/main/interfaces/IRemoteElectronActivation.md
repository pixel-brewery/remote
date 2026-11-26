# Interface: IRemoteElectronActivation

Main-only local-view activation. Strip the cookie before returning a renderer response.

## Extends

- `IRemoteLocalView`

## Properties

### connectionId

> `readonly` **connectionId**: `string`

#### Inherited from

`IRemoteLocalView.connectionId`

***

### cookie

> `readonly` **cookie**: `object`

Ephemeral loopback capability installed through Electron session.cookies in Main.

#### httpOnly

> `readonly` **httpOnly**: `true`

Required protection against JavaScript cookie access.

#### name

> `readonly` **name**: `string`

Gateway-selected cookie name.

#### path

> `readonly` **path**: `"/"`

Root cookie path within the selected loopback view.

#### sameSite

> `readonly` **sameSite**: `"strict"`

Required cross-site request restriction.

#### secure

> `readonly` **secure**: `false`

HTTP loopback mode uses a non-Secure capability; remote TLS policy is independent.

#### value

> `readonly` **value**: `string`

Private random local capability; never serialize into renderer state.

***

### identity

> `readonly` **identity**: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `hostId`: `z.ZodString`; \}, `z.core.$strict`\>\>

#### Inherited from

`IRemoteLocalView.identity`

***

### origin

> `readonly` **origin**: `string`

#### Inherited from

`IRemoteLocalView.origin`
