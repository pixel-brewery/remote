# Variable: remoteContentPolicySchema

> `const` **remoteContentPolicySchema**: `ZodReadonly`\<`ZodObject`\<\{ `allowHttpsConnections`: `ZodDefault`\<`ZodBoolean`\>; `allowHttpsImages`: `ZodDefault`\<`ZodBoolean`\>; `allowHttpsMedia`: `ZodDefault`\<`ZodBoolean`\>; \}, `$strict`\>\>

Validates application-owned HTTPS source permissions for trusted packaged native content.

## Remarks

Every permission defaults to false. Scripts, frames, navigation and privileged product proxy policy cannot be configured through this contract.
