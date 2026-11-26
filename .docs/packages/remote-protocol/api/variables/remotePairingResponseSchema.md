# Variable: remotePairingResponseSchema

> `const` **remotePairingResponseSchema**: `ZodReadonly`\<`ZodDiscriminatedUnion`\<\[`ZodObject`\<\{ `expiresAt`: `ZodISODateTime`; `pairingId`: `ZodString`; `status`: `ZodLiteral`\<`"pending"`\>; \}, `$strict`\>, `ZodObject`\<\{ `credential`: `ZodOptional`\<`ZodString`\>; `session`: `ZodReadonly`\<`ZodObject`\<\{ `host`: `ZodReadonly`\<`ZodObject`\<\{ `endpoints`: ...; `identity`: ...; `name`: ...; `protocolVersion`: ...; \}, `$strict`\>\>; `principal`: `ZodReadonly`\<`ZodObject`\<\{ `appId`: ...; `capabilities`: ...; `deviceId`: ...; `hostId`: ...; \}, `$strict`\>\>; \}, `$strict`\>\>; `status`: `ZodLiteral`\<`"paired"`\>; \}, `$strict`\>\], `"status"`\>\>

Cookie mode omits credentials; privileged bearer adapters consume and remove them.
