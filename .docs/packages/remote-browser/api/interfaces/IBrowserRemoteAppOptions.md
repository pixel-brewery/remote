# Interface: IBrowserRemoteAppOptions\<TMetadata\>

Application composition of the pre-framework remote gate.

## Type Parameters

### TMetadata

`TMetadata`

Application-validated metadata read through the authorized session, such as capabilities.

## Properties

### appId

> `readonly` **appId**: `string`

Application namespace; invitations, hosts, saved connections and local views of other applications are rejected.

***

### attemptStorageKey?

> `readonly` `optional` **attemptStorageKey?**: `string`

Session storage key for the public pairing-attempt identifier; defaults to `<appId>.remote.pending-attempt`.
The stored value never contains the invitation challenge.

***

### controls?

> `readonly` `optional` **controls?**: `IRemoteControlBridge`

Optional closed native connection-control bridge of a packaged client. Its presence makes the client start
normally outside its protected loopback view and enables connection commands.

***

### deviceName?

> `readonly` `optional` **deviceName?**: () => `string`

Optional label factory for browser fragment pairing; defaults to the navigator platform followed by "browser".

#### Returns

`string`

***

### localOrigins

> `readonly` **localOrigins**: readonly `string`[]

Exact origins that always start normally without probing, for example an embedded local host.
They are also never accepted as a native remote view.

***

### onObserverError?

> `readonly` `optional` **onObserverError?**: (`error`) => `void`

Optional sink for exceptions thrown by phase observers; observer failures never change the gate lifecycle.
The sink itself must not throw.

#### Parameters

##### error

`unknown`

#### Returns

`void`

***

### readCapabilities

> `readonly` **readCapabilities**: (`session`, `signal`) => `Promise`\<`TMetadata`\>

Read and validate the application's own metadata through the ready session before `ready` is published.
A rejection publishes `error` with reason `capabilities`. The signal aborts on deadline, replacement and disposal.

#### Parameters

##### session

`RemoteSession`

##### signal

`AbortSignal`

#### Returns

`Promise`\<`TMetadata`\>

***

### scanner?

> `readonly` `optional` **scanner?**: [`IBrowserRemotePairingScanner`](IBrowserRemotePairingScanner.md)

Optional real native invitation scanner; it is offered only together with native controls.

***

### timeoutMs?

> `readonly` `optional` **timeoutMs?**: `number`

Deadline in milliseconds for one preparation; defaults to 15000. For a remote start (an invitation or a native
loopback view) expiry publishes `error` with reason `connection`; an ordinary start whose probe does not answer in
time starts normally.

***

### window

> `readonly` **window**: [`IBrowserRemoteWindow`](IBrowserRemoteWindow.md)

Current document window or an equivalent structural port.
