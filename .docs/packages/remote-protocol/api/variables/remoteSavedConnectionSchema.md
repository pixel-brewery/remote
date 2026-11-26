# Variable: remoteSavedConnectionSchema

> `const` **remoteSavedConnectionSchema**: `ZodReadonly`\<`ZodObject`\<\{ `endpoints`: `ZodReadonly`\<`ZodArray`\<`ZodReadonly`\<`ZodObject`\<\{ `id`: `ZodString`; `origin`: `ZodURL`; `transportId`: `ZodString`; \}, `$strict`\>\>\>\>; `id`: `ZodString`; `identity`: `ZodReadonly`\<`ZodObject`\<\{ `appId`: `ZodString`; `hostId`: `ZodString`; \}, `$strict`\>\>; `label`: `ZodString`; `selectedEndpointId`: `ZodString`; \}, `$strict`\>\>

Credential-free native/browser connection profile.
