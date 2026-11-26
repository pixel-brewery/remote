# Function: createRemoteControlBridge()

> **createRemoteControlBridge**(`invoke`): [`IRemoteControlBridge`](../interfaces/IRemoteControlBridge.md)

Build a frozen safe API around the application's existing fixed IPC channel.

## Parameters

### invoke

(`request`) => `Promise`\<`unknown`\>

Privileged runtime invocation closure; this function is never exposed to the renderer.

## Returns

[`IRemoteControlBridge`](../interfaces/IRemoteControlBridge.md)

Validated connection operations containing no credential or arbitrary request method.
