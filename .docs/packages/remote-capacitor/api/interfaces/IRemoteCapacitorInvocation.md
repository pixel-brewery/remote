# Interface: IRemoteCapacitorInvocation

Canonical payload accepted by the closed Capacitor control method.

## Properties

### request

> `readonly` **request**: `Readonly`\<\{ `kind`: `"connections.list"`; \}\> \| `Readonly`\<\{ `connectionId`: `string`; `kind`: `"connections.open"`; \}\> \| `Readonly`\<\{ `connectionId`: `string`; `kind`: `"connections.close"`; \}\> \| `Readonly`\<\{ `connectionId`: `string`; `kind`: `"connections.forget"`; \}\> \| `Readonly`\<\{ `bootstrap`: `z.ZodReadonly`\<`z.ZodObject`\<\{ `appId`: `z.ZodString`; `challenge`: `z.ZodString`; `expiresAt`: `z.ZodISODateTime`; `hostId`: `z.ZodString`; `origin`: `z.ZodURL`; \}, `z.core.$strict`\>\>; `deviceName`: `string`; `kind`: `"pairings.complete"`; \}\>

Validated connection command; never an arbitrary request URL or credential.
