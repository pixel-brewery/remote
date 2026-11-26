# Class: ElectronRemoteDesktop

Electron Main owner of one application's remote controls, OS vault and network Utility Process.

## Remarks

Construct after Electron app readiness, `attach` the current primary window and await
`dispose` during application shutdown. Construction registers exactly one IPC handler on the
configured channel and performs no network, process or Keychain work. The first control lazily
forks the Utility Process started by `startElectronRemoteUtility`; only Main opens the
`safeStorage`-backed `ElectronCredentialVault` and answers the Utility's credential requests.

Opening a saved connection or completing a pairing first releases the active view, because the
Utility closes the current gateway before it connects the next one; a failed replacement returns
the window to its local renderer. A successful activation installs the private loopback cookie in
the window session, ordered behind every earlier cookie write, then reports the origin through
`onRemoteRenderer` and lets Main itself load `origin + '/'`: the gateway admits only a navigation
without a site (`Sec-Fetch-Site: none`), which a renderer-initiated navigation never has. Each
activation belongs to its original validated invocation; closing or forgetting that connection,
starting another selection, closing or replacing the window, a Utility exit or disposal prevents
an obsolete activation from publishing trust or navigating. Closing the window stops the Utility.

## Constructors

### Constructor

> **new ElectronRemoteDesktop**(`_options`): `ElectronRemoteDesktop`

Validate the application composition and register its single fixed IPC channel.

#### Parameters

##### \_options

[`IElectronRemoteDesktopOptions`](../interfaces/IElectronRemoteDesktopOptions.md)

Application namespace, channel, absolute paths, forbidden origins, callbacks
and optional timeouts. Defaults are documented on the options interface.

#### Returns

`ElectronRemoteDesktop`

#### Throws

Error for a non-canonical namespace or channel, a relative path, an invalid forbidden
origin or timeout, or when Electron already has a handler registered for the channel.

## Methods

### attach()

> **attach**(`window`, `localRenderer`): `void`

Bind the controls to the current primary window and its original local renderer.

#### Parameters

##### window

`BrowserWindow`

Sandboxed, context-isolated application window whose main frame invokes the channel.

##### localRenderer

`string`

Exact packaged `file:` URL or local HTTP(S) renderer origin loaded after
a remote view closes. Its origin is never accepted as a gateway view.

#### Returns

`void`

#### Throws

Error after disposal, while another live window is attached, or for any other renderer URL.

***

### dispose()

> **dispose**(): `Promise`\<`void`\>

Remove the IPC handler and stop the owned Utility Process.

#### Returns

`Promise`\<`void`\>

Completion after the Utility Process has stopped.

#### Remarks

The first call rejects further control work, asks the Utility to dispose and kills it
after its `disposed` signal or the dispose timeout. Repeated calls resolve immediately.
Profiles and encrypted grants stay durable; no remote host is revoked.
