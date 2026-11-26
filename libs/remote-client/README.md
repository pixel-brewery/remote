# @pixel-brewery/remote-client

Headless product-neutral connection and session ownership. This ESM package has no Node, browser-global, Electron, Angular or Capacitor dependency. Supply explicit connector, clock, operation-ID and profile-store ports. Protocol types and validation come from `@pixel-brewery/remote-protocol`.

`RemoteSession` owns one selected installation. Construct it without side effects, call `initialize()` to verify public app/host identity before restoring a credential, and use `pair(invitation, deviceName)` when pairing is required. Concurrent initialization/pairing calls share their operation. Pending approval retains the same attempt identifier; repeating it safely recovers the result. Product endpoint failures do not invalidate successful pairing.

`request()` streams original product bytes once. Consume its body or call `cancel()`. An interrupted mutation throws `RemoteClientError` with `OUTCOME_UNKNOWN`; reconcile domain state before deciding whether to retry. Authentication restore uses bounded exponential backoff (8 attempts, 500ms initial and 30s maximum by default) and never replays writes. `onReconcile()` lets the product re-read its own state after restore. `disconnect()`, `revoke()` and idempotent `dispose()` have separate meanings: local cancellation, host device-grant revocation, and permanent controller disposal.

`RemoteConnectionManager` validates app-scoped credential-free profiles, persists complete snapshots atomically through `IRemoteProfileStore`, serializes selection/save/forget, and disposes the previous active session. Applications supply protected credentials through a separate privileged port. Profile metadata never carries bearer credentials or pairing challenges.

`createRemoteControlBridge()` validates and freezes a closed native-view API: list, pair, open, close and forget. Its invocation closure remains private. It cannot fetch arbitrary URLs, register routes, inspect credentials or accept product asset roots.

Build, typecheck and exercise lifecycle behavior with `yarn nx run remote-client:build`, `:typecheck` and `:test`. Public API documentation is generated from colocated source TSDoc. Framework bindings must observe this canonical state owner.
