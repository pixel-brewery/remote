# Type Alias: IRemoteContentPolicy

> **IRemoteContentPolicy** = `Readonly`\<`z.input`\<*typeof* [`remoteContentPolicySchema`](../variables/remoteContentPolicySchema.md)\>\>

Optional application-owned HTTPS content permissions, with all omitted flags denied.

## Remarks

This is the canonical schema's input type; parsing supplies false defaults and freezes the resolved policy.
