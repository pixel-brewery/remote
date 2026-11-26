# Variable: remoteAccessStateSchema

> `const` **remoteAccessStateSchema**: `ZodReadonly`\<`ZodObject`\<\{ `devices`: `ZodReadonly`\<`ZodArray`\<`ZodReadonly`\<`ZodObject`\<\{ `capabilities`: `ZodReadonly`\<`ZodArray`\<`ZodString`\>\>; `id`: `ZodString`; `lastSeenAt`: `ZodOptional`\<`ZodISODateTime`\>; `name`: `ZodString`; `pairedAt`: `ZodISODateTime`; `tokenHash`: `ZodString`; \}, `$strict`\>\>\>\>; `enabled`: `ZodBoolean`; `identity`: `ZodReadonly`\<`ZodObject`\<\{ `appId`: `ZodString`; `hostId`: `ZodString`; \}, `$strict`\>\>; `version`: `ZodLiteral`\<`1`\>; \}, `$strict`\>\>

Versioned private storage contract. Never expose this record in renderer projections.
