# Variable: remoteErrorResponseSchema

> `const` **remoteErrorResponseSchema**: `ZodObject`\<\{ `error`: `ZodObject`\<\{ `code`: `ZodEnum`\<\{ `consumed`: `"consumed"`; `disposed`: `"disposed"`; `expired`: `"expired"`; `forbidden`: `"forbidden"`; `incompatible`: `"incompatible"`; `invalid-request`: `"invalid-request"`; `network`: `"network"`; `not-ready`: `"not-ready"`; `persistence`: `"persistence"`; `resource-limit`: `"resource-limit"`; `unauthorized`: `"unauthorized"`; `unknown-outcome`: `"unknown-outcome"`; \}\>; `message`: `ZodString`; \}, `$strict`\>; \}, `$strict`\>

Safe protocol failure. Never contains internal causes, tokens or filesystem paths.
