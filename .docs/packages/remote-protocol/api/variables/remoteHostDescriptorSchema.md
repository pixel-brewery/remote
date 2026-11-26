# Variable: remoteHostDescriptorSchema

> `const` **remoteHostDescriptorSchema**: `ZodReadonly`\<`ZodObject`\<\{ `endpoints`: `ZodReadonly`\<`ZodArray`\<`ZodReadonly`\<`ZodObject`\<\{ `id`: `ZodString`; `origin`: `ZodURL`; `transportId`: `ZodString`; \}, `$strict`\>\>\>\>; `identity`: `ZodReadonly`\<`ZodObject`\<\{ `appId`: `ZodString`; `hostId`: `ZodString`; \}, `$strict`\>\>; `name`: `ZodString`; `protocolVersion`: `ZodLiteral`\<`1`\>; \}, `$strict`\>\>

Public, bounded installation descriptor. Contains no product data or credential.
