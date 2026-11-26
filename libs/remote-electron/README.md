# @pixel-brewery/remote-electron

Electron45 adapters with separate `@pixel-brewery/remote-electron/main`, `/preload` and `/utility` entrypoints. The package root exports renderer-safe types only.

Main composes `ElectronCredentialVault`, `ElectronRemoteController`, a narrow `IRemoteElectronRuntime` proxy and its existing fixed IPC channel. Inspect the real `IpcMainInvokeEvent`: accept only the owned main frame and packaged/selected local document. Main installs the private gateway capability through Electron session cookies before navigation. Never return the activation cookie to renderer code.

`ElectronCredentialVault` requires available OS-backed `safeStorage`, rejects Linux `basic_text`, isolates app/host records and writes only encrypted ciphertext to an atomic private file. Construct after app readiness. No plaintext fallback exists. Main supplies a closed get/set/delete credential mediation port to Utility; arbitrary filesystem or renderer requests are not credential authority.

Run `ElectronRemoteUtility` in the application's Utility Process. It verifies the exact host identity, pairs/restores native bearer grants, persists safe profiles and starts the Node loopback content gateway. The gateway serves packaged assets and explicitly registered HTTP/SSE/WebSocket/media operations from one selected private peer. Each native view has a distinct private HttpOnly local capability. Closing/forgetting the selected profile cancels its streams; other profiles retain their scope. Main does no network work.

Bundle `createRemotePreloadBridge()` into a sandbox-compatible CommonJS preload. Expose only its frozen connection operations with `contextBridge`; retain the fixed `ipcRenderer.invoke` closure inside preload. Keep sandbox, context isolation and web security enabled, deny remote privileged scripts and new windows, and restrict navigation/requests to immutable assets or the exact active loopback origin.

Applications own storage locations, asset roots, business route/capability registration, product certificates and lifecycle supervision. The SDK embeds no product certificate or domain. `apps/fixture-desktop` implements the full Main/Utility/preload composition with the shared packaged acceptance UI. Run `yarn nx run remote-electron:build`, `:typecheck` and `:test` for source and OS-vault boundary tests. Actual OS credential availability and packaged application behavior require native runtime acceptance evidence.

`IRemoteElectronUtilityOptions.contentPolicy` accepts optional `allowHttpsImages`, `allowHttpsMedia` and `allowHttpsConnections` flags. Each defaults to false and extends only its corresponding packaged-UI CSP directive with HTTPS. It grants no remote proxy route, remote script, frame or navigation permission. Applications explicitly opt into resources their existing UI needs.
