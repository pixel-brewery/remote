# Function: provideRemoteSession()

> **provideRemoteSession**(`factory`): `EnvironmentProviders`

Register one headless session with injector-owned cleanup and no eager network initialization.

## Parameters

### factory

() => `RemoteSession`

Injection-context factory selecting the application identity and runtime connector.

## Returns

`EnvironmentProviders`

Environment providers for a root or lazy route scope.

## Remarks

The injector disposes the same session that signal consumers observe. The application calls initialize explicitly.
