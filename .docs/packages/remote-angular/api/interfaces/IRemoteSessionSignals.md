# Interface: IRemoteSessionSignals

Read-only signal projection over the canonical client session.

## Properties

### ready

> `readonly` **ready**: `Signal`\<`boolean`\>

Whether application operations may currently be requested.

***

### session

> `readonly` **session**: `RemoteSession`

The same session registered by the application.

***

### state

> `readonly` **state**: `Signal`\<`RemoteSessionState`\>

Credential-free current state.
