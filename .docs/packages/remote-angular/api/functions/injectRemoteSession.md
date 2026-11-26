# Function: injectRemoteSession()

> **injectRemoteSession**(): [`IRemoteSessionSignals`](../interfaces/IRemoteSessionSignals.md)

Project the injected canonical lifecycle into Angular read-only signals.

## Returns

[`IRemoteSessionSignals`](../interfaces/IRemoteSessionSignals.md)

The original session, its current snapshot and a derived ready signal.

## Remarks

Call within an Angular injection context. Consumer destruction removes only its subscription; the provider owns disposal.
