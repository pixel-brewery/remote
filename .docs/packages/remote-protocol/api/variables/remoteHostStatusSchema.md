# Variable: remoteHostStatusSchema

> `const` **remoteHostStatusSchema**: `ZodReadonly`\<`ZodObject`\<\{ `access`: `ZodReadonly`\<`ZodObject`\<\{ `devices`: `ZodReadonly`\<`ZodArray`\<`ZodReadonly`\<`ZodObject`\<\{ `capabilities`: ...; `id`: ...; `lastSeenAt`: ...; `name`: ...; `pairedAt`: ...; \}, `$strict`\>\>\>\>; `enabled`: `ZodBoolean`; `pendingPairings`: `ZodReadonly`\<`ZodArray`\<`ZodReadonly`\<`ZodObject`\<\{ `deviceName`: ...; `expiresAt`: ...; `id`: ...; \}, `$strict`\>\>\>\>; \}, `$strict`\>\>; `errorCode`: `ZodOptional`\<`ZodString`\>; `host`: `ZodReadonly`\<`ZodObject`\<\{ `endpoints`: `ZodReadonly`\<`ZodArray`\<`ZodReadonly`\<`ZodObject`\<\{ `id`: ...; `origin`: ...; `transportId`: ...; \}, `$strict`\>\>\>\>; `identity`: `ZodReadonly`\<`ZodObject`\<\{ `appId`: `ZodString`; `hostId`: `ZodString`; \}, `$strict`\>\>; `name`: `ZodString`; `protocolVersion`: `ZodLiteral`\<`1`\>; \}, `$strict`\>\>; `state`: `ZodEnum`\<\{ `available`: `"available"`; `disabled`: `"disabled"`; `disposed`: `"disposed"`; `rebinding`: `"rebinding"`; `starting`: `"starting"`; `stopping`: `"stopping"`; `unavailable`: `"unavailable"`; \}\>; \}, `$strict`\>\>

Credential-free snapshot of a host's private local administration state.

## Remarks

Mirrors the Node host status projection: listener lifecycle, the public descriptor,
activation intent, paired device metadata and consumed unfinished pairings. Applications serve
it only from their own private host-control endpoint. Unknown fields are rejected at every
level, so a token hash, credential or challenge can never widen a browser projection.
