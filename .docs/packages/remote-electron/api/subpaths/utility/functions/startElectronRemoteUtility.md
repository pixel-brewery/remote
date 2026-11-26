# Function: startElectronRemoteUtility()

> **startElectronRemoteUtility**(`options`): `void`

Run the application's remote connection owner inside its Electron Utility Process.

## Parameters

### options

[`IElectronRemoteUtilityProcessOptions`](../interfaces/IElectronRemoteUtilityProcessOptions.md)

Application namespace, route loader and optional content policy, profile store
factory and credential timeout.

## Returns

`void`

## Remarks

Call once from the bundled Utility entry that `ElectronRemoteDesktop` forks. The
function listens on `process.parentPort` and announces `ready`; Main then sends one
initialization with the absolute asset and storage paths. Initialization cross-checks the
application namespace, loads the routes through `loadRoutes`, validates the content policy with
its canonical schema and composes an `ElectronRemoteUtility` whose credential store is a bounded
request channel to Main's OS vault. Only the canonical list, pair, open, close and forget
controls are dispatched; every message is validated before use and each control receives one
correlated reply. The Main/Utility message protocol is internal to this package. A `dispose`
message rejects pending credential requests, closes every owned socket and answers `disposed`;
Main owns the startup deadline and the bounded shutdown fallback.

## Throws

Error outside an Electron Utility Process, for a non-canonical namespace or timeout, or
when the runtime was already started on this parent port.
