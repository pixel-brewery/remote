# Integrate Remote

## Install the published packages

The nine SDK packages are published together at version `0.1.0` in GitHub
Packages. Configure your package manager's `@pixel-brewery` scope for
`https://npm.pkg.github.com` and supply an existing package-readable token through
the calling environment. Public GitHub npm packages still use authenticated
registry access. Never commit a token value.

For Yarn, the application can use this `.yarnrc.yml` configuration:

```yaml
npmScopes:
    pixel-brewery:
        npmRegistryServer: 'https://npm.pkg.github.com'
        npmAlwaysAuth: true
        npmAuthToken: '${GITHUB_TOKEN-}'
```

Install the packages needed by the owning runtime at the same family version. A
Node host consuming the access service and protocol directly starts with:

```sh
yarn add @pixel-brewery/remote-node@0.1.0 @pixel-brewery/remote-core@0.1.0 @pixel-brewery/remote-protocol@0.1.0
```

Browser consumers use `remote-browser` and `remote-client`; Angular, Electron and
Capacitor compositions add their corresponding adapter. Declare direct imports
in each consuming workspace and let the package manager update the lockfile.
Keep Node and privileged native adapters outside browser bundles. Do not replace
published dependencies with source aliases, copied code or package patches.

## Host responsibilities

Provide a stable `appId` and persist the generated installation identity in the
application's private storage. Supply the access store, registered operations,
application dispatcher and packaged asset root to the Node host. Start and stop
the host through the application's supervised lifecycle. A persisted enabled
preference is separate from current network availability.

For each operation register its method/path, capabilities, streaming kind,
resource limits and retry policy. Dispatch original streams to the application's
canonical validation and authorization pipeline. A successful device pairing
does not authorize an operation missing from that registry.

Keep session credentials out of product snapshots, error messages and logs.
Integrate device revocation with the settings surface that owns remote access.
Use typed protocol errors to select product-owned localized messages.

## Browser clients

Serve the client assets and registered API from the same origin. Bootstrap the
remote session before loading product data. Use the browser connector's cookie
credentials and fragment adapter. A product API failure is distinct from session
denial and must not force another QR scan after successful pairing.

The browser's ordinary camera application can open the pairing URL. A desktop
client can paste that same URL. Do not require camera APIs on an insecure HTTP
page. The operation-ID factory uses cryptographically secure random bytes that
remain available in HTTP LAN contexts.

## Native clients

Configure the Electron or Capacitor runtime with the application asset root and
explicit operation registry. Bind the local view to one saved connection. Install
the ephemeral local capability before the view loads. The renderer/WebView never
selects arbitrary upstream URLs or supplies authorization headers.

Use existing application views and client contracts through the local gateway.
Keep provider media that is intentionally client-direct on its original HTTPS
path. Host-relative application files use the connection's content URL adapter.
Closing the view, forgetting a connection, switching hosts or revoking access
cancels its local and remote streams.

## Ready-made application composition

From `0.2.0` the SDK ships the composition that every consumer otherwise
re-implements. Applications keep their own policy, views and wiring.

| Need                                           | Package and API                                                                                                                                                                                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Serialized host lifecycle without polling      | `remote-node`: `RemoteHostRuntime` rechecks the network when access is enabled, before every invitation and on explicit `reconcile`; only lifecycle operations change its retained availability                                                                           |
| Private local host controls                    | `remote-node`: `handleRemoteHostControl` (GET status; POST enable, disable, reconcile, pair, revoke). The application authorizes the local caller before calling it                                                                                                       |
| Request provenance and dispatch                | `remote-node`: `RemoteRequestAdmissions` and `createRemoteApplicationHandler`, which strips device credentials and origin from all header views after admission                                                                                                           |
| Route registry from an OpenAPI contract        | `remote-core`: `createRemoteRoutesFromOpenApi` with an include/exclude prefix policy and request limits; `createRemoteNativeRouteSources` emits the matching JSON, Kotlin and Swift inventory                                                                             |
| Live host settings                             | `remote-core`: access events now include `paired`; `NodeRemoteHost.subscribe` forwards them                                                                                                                                                                               |
| Browser start before the application framework | `remote-browser`: `BrowserRemoteApp` classifies the start, pairs from the fragment (also when it changes in the same document), restores the session, reads the application's capabilities and reports one phase. An ordinary deployment never sees an intermediate state |
| Local host settings in the browser             | `remote-browser`: `RemoteHostControlClient`, validated by `remote-protocol`'s `remoteHostStatusSchema`                                                                                                                                                                    |
| Desktop Main and network process               | `remote-electron`: `ElectronRemoteDesktop` in Main, `startElectronRemoteUtility` in the Utility Process and `JsonRemoteProfileStore`. Main opens the gateway view itself, a replacement releases the active view and a closed view's cookie is removed                    |

An application that bundles the Electron utility as an ES module with esbuild
adds a `createRequire` banner: the SDK's `ws` dependency requires Node built-ins.
On Android the protected view's cookie is persistent for a bounded time, because
Capacitor removes session cookies whenever it recreates the bridge.

## Certificates

Applications own certificate procurement, renewal, protected keys and trust
configuration. Supply current material through the Node HTTPS adapter's TLS
provider. Remote validates and applies material; it does not register domains,
operate a CA, distribute a shared private key or silently disable validation.

## Consumer-specific ownership

Symphony maps typed remote operations to existing application use cases and keeps
host configuration separate from remote display configuration. Weasel admits
verified remote requests to its existing controller graph, preserving OpenAPI,
generated clients and business authorization. Neither product exports its entire
internal request surface merely because a client is paired.
