# Interface: IRemoteHostRuntimeOptions

Resource bounds of a serialized host runtime.

## Properties

### maxPendingOperations?

> `readonly` `optional` **maxPendingOperations?**: `number`

Maximum running plus queued operations, default 16 and at most 1024; further commands fail with `resource-limit`.
