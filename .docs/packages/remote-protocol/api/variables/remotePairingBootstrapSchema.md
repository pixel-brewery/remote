# Variable: remotePairingBootstrapSchema

> `const` **remotePairingBootstrapSchema**: `ZodReadonly`\<`ZodObject`\<\{ `appId`: `ZodString`; `challenge`: `ZodString`; `expiresAt`: `ZodISODateTime`; `hostId`: `ZodString`; `origin`: `ZodURL`; \}, `$strict`\>\>

Short-lived host-created pairing material. Never log or persist it as product state.
