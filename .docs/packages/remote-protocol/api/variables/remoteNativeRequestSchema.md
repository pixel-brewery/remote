# Variable: remoteNativeRequestSchema

> `const` **remoteNativeRequestSchema**: `ZodReadonly`\<`ZodDiscriminatedUnion`\<\[`ZodObject`\<\{ `kind`: `ZodLiteral`\<`"connections.list"`\>; \}, `$strict`\>, `ZodObject`\<\{ `connectionId`: `ZodString`; `kind`: `ZodLiteral`\<`"connections.open"`\>; \}, `$strict`\>, `ZodObject`\<\{ `connectionId`: `ZodString`; `kind`: `ZodLiteral`\<`"connections.close"`\>; \}, `$strict`\>, `ZodObject`\<\{ `connectionId`: `ZodString`; `kind`: `ZodLiteral`\<`"connections.forget"`\>; \}, `$strict`\>, `ZodObject`\<\{ `bootstrap`: `ZodReadonly`\<`ZodObject`\<\{ `appId`: `ZodString`; `challenge`: `ZodString`; `expiresAt`: `ZodISODateTime`; `hostId`: `ZodString`; `origin`: `ZodURL`; \}, `$strict`\>\>; `deviceName`: `ZodString`; `kind`: `ZodLiteral`\<`"pairings.complete"`\>; \}, `$strict`\>\], `"kind"`\>\>

Closed native control surface. It cannot fetch arbitrary URLs or read credentials.
