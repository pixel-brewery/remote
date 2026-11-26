# Function: createRemotePreloadBridge()

> **createRemotePreloadBridge**(`invoke`): `IRemoteControlBridge`

Build a frozen renderer API for one fixed preload IPC channel.

## Parameters

### invoke

(`request`) => `Promise`\<`unknown`\>

Preload-owned invocation closure; never expose this generic closure to the renderer.

## Returns

`IRemoteControlBridge`

Narrow validated connection controls without credentials or arbitrary URL dispatch.
