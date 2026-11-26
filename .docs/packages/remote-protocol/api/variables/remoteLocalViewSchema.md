# Variable: remoteLocalViewSchema

> `const` **remoteLocalViewSchema**: `ZodReadonly`\<`ZodObject`\<\{ `connectionId`: `ZodString`; `identity`: `ZodReadonly`\<`ZodObject`\<\{ `appId`: `ZodString`; `hostId`: `ZodString`; \}, `$strict`\>\>; `origin`: `ZodURL`; \}, `$strict`\>\>

Safe local-view descriptor; its ephemeral cookie stays in the privileged runtime.
