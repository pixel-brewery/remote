# Variable: remoteSessionDescriptorSchema

> `const` **remoteSessionDescriptorSchema**: `ZodReadonly`\<`ZodObject`\<\{ `host`: `ZodReadonly`\<`ZodObject`\<\{ `endpoints`: `ZodReadonly`\<`ZodArray`\<`ZodReadonly`\<`ZodObject`\<\{ `id`: ...; `origin`: ...; `transportId`: ...; \}, `$strict`\>\>\>\>; `identity`: `ZodReadonly`\<`ZodObject`\<\{ `appId`: `ZodString`; `hostId`: `ZodString`; \}, `$strict`\>\>; `name`: `ZodString`; `protocolVersion`: `ZodLiteral`\<`1`\>; \}, `$strict`\>\>; `principal`: `ZodReadonly`\<`ZodObject`\<\{ `appId`: `ZodString`; `capabilities`: `ZodReadonly`\<`ZodArray`\<`ZodString`\>\>; `deviceId`: `ZodString`; `hostId`: `ZodString`; \}, `$strict`\>\>; \}, `$strict`\>\>

Verified device session without its bearer or cookie credential.
