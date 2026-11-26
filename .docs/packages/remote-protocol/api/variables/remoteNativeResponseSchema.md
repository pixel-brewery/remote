# Variable: remoteNativeResponseSchema

> `const` **remoteNativeResponseSchema**: `ZodReadonly`\<`ZodDiscriminatedUnion`\<\[`ZodObject`\<\{ `connections`: `ZodReadonly`\<`ZodArray`\<`ZodReadonly`\<`ZodObject`\<\{ `endpoints`: `ZodReadonly`\<...\>; `id`: `ZodString`; `identity`: `ZodReadonly`\<...\>; `label`: `ZodString`; `selectedEndpointId`: `ZodString`; \}, `$strict`\>\>\>\>; `kind`: `ZodLiteral`\<`"connections"`\>; \}, `$strict`\>, `ZodObject`\<\{ `kind`: `ZodLiteral`\<`"view"`\>; `view`: `ZodReadonly`\<`ZodObject`\<\{ `connectionId`: `ZodString`; `identity`: `ZodReadonly`\<`ZodObject`\<\{ `appId`: ...; `hostId`: ...; \}, `$strict`\>\>; `origin`: `ZodURL`; \}, `$strict`\>\>; \}, `$strict`\>, `ZodObject`\<\{ `kind`: `ZodLiteral`\<`"done"`\>; \}, `$strict`\>\], `"kind"`\>\>

Validated privileged response containing no remote or local credentials.
