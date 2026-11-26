# Function: createCapacitorRemoteBridge()

> **createCapacitorRemoteBridge**(`implementation?`): [`IRemoteCapacitorBridge`](../interfaces/IRemoteCapacitorBridge.md)

Bind the native loopback gateway without globally patching fetch or XMLHttpRequest.

## Parameters

### implementation?

[`IRemoteCapacitorPlugin`](../interfaces/IRemoteCapacitorPlugin.md)

Optional injected plugin for deterministic tests or native host composition.

## Returns

[`IRemoteCapacitorBridge`](../interfaces/IRemoteCapacitorBridge.md)

Safe connection and scanning commands, with native credentials hidden.
