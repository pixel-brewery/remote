# Variable: remotePairingRequestSchema

> `const` **remotePairingRequestSchema**: `ZodReadonly`\<`ZodObject`\<\{ `attemptId`: `ZodString`; `challenge`: `ZodString`; `credentialMode`: `ZodEnum`\<\{ `bearer`: `"bearer"`; `cookie`: `"cookie"`; \}\>; `deviceName`: `ZodString`; \}, `$strict`\>\>

One repeatable pairing attempt. Its identifier remains stable until completion.
