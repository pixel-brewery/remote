# remote-electron composition

`@pixel-brewery/remote-electron` ships three runtime entry points that must stay
in their own processes: `/main` for Electron Main, `/utility` for the network
Utility Process and `/preload` for the sandboxed preload. The package root exports
renderer-safe types only. Generated declarations live in the [API reference](api/index.md).

## Generic desktop composition

An application needs three small files instead of hand-written process plumbing.

| Process | Entry      | Application code                                                                                                                                 |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Main    | `/main`    | Construct `ElectronRemoteDesktop` after app readiness, `attach(window, localRenderer)` each primary window, await `dispose()` before quitting.   |
| Utility | `/utility` | Call `startElectronRemoteUtility({ appId, loadRoutes, contentPolicy?, createProfileStore? })` from the bundled Utility entry.                    |
| Preload | `/preload` | Expose `createRemotePreloadBridge((request) => ipcRenderer.invoke(channel, request))` with `contextBridge`; keep the generic closure in preload. |

`IElectronRemoteDesktopOptions` names the `appId`, the fixed IPC `channel`, the
absolute `utilityPath`, `assetsPath` and `storageDirectory`, and optionally
`forbiddenOrigins`, `onRemoteRenderer`, `logger`, `serviceName`,
`allowLoopbackForTests` and the initialization (15 s), operation (30 s) and
dispose (2 s) timeouts. The owner registers exactly one `ipcMain.handle` on the
channel and removes it on `dispose()`. Constructing a second owner for the same
channel fails like any duplicate Electron handler.

### Main semantics

- Construction performs no network, process or Keychain work. The first control
  forks the Utility with `utilityProcess.fork`; output is forwarded to `logger`
  in chunks of at most 8192 characters, otherwise the Utility inherits stdio.
- Only Main opens `ElectronCredentialVault` (`storageDirectory/credentials.json`)
  through `safeStorage`. Utility credential requests are checked against the
  canonical identity schema and the application namespace.
- A trusted sender is the attached window's live main frame showing the local
  renderer or the active gateway origin.
- Opening or pairing releases the active view immediately, because the Utility
  closes the current gateway before it connects the next one. A failed
  replacement returns to the local renderer.
- A gateway view must be an exact `http://127.0.0.1:<port>` origin that is
  neither one of `forbiddenOrigins` (for example an embedded local backend) nor
  the local renderer. Main installs its HttpOnly cookie in the window session,
  ordered behind earlier cookie writes, calls `onRemoteRenderer(origin)` and
  then loads `origin + '/'` itself: the gateway admits only a navigation with
  `Sec-Fetch-Site: none`, which a renderer-initiated navigation never has.
- Each activation belongs to its original invocation. Close or forget of that
  connection, a newer selection, a window close or replacement, a Utility exit
  and disposal all prevent an obsolete activation from publishing trust or
  navigating. A matching close or forget returns to the local renderer and calls
  `onRemoteRenderer(undefined)`.
- `dispose()` asks the Utility to dispose, waits for its `disposed` signal (other
  messages may arrive first) or exit, and kills it after the dispose timeout.
  Profiles and encrypted grants stay durable.

### Utility semantics

`startElectronRemoteUtility` listens on `process.parentPort`, announces `ready`
and accepts one initialization. It cross-checks the namespace announced by Main,
rejects relative paths, loads the route inventory through `loadRoutes(assetsPath)`
(the application decides where its generated inventory lives), validates
`contentPolicy` with the canonical schema and creates the profile store
(`JsonRemoteProfileStore` at `profiles.json` by default). The canonical route
registry validates the routes again before any connection opens. Malformed
controls receive a correlated failure; unknown messages are dropped.

`JsonRemoteProfileStore` keeps at most 64 credential-free profiles of one
namespace in a private bounded regular file. Writes are validated before they
are queued, serialized in caller order, flushed and atomically renamed; the strict
profile schema rejects credential fields.

### Internal process protocol

The Main/Utility messages are an internal contract of this package and may
change with it. Every envelope is checked for its exact keys; payloads use the
canonical protocol schemas.

| Direction    | Messages                                                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Utility→Main | `ready`, `initialized`, `initialization.failed`, `reply` (id with value or error), `credential` (id, operation, identity, bearer for set only), `disposed` |
| Main→Utility | `initialize` (appId, assetsPath, storageDirectory, allowLoopbackForTests), `control` (id, request), `credential.reply` (id with value or error), `dispose` |

Activation replies carry the private loopback cookie to Main only;
`ElectronRemoteController` validates and strips it before any renderer response.

## Packaging the Utility entry

The SDK's `ws` dependency is CommonJS and calls `require` for Node built-ins. An
application that bundles its Utility entry as an ES module (for example with
esbuild `format: 'esm'`) must define `require` for those calls, otherwise the
Utility fails at startup with esbuild's `Dynamic require of "…" is not supported` error:

```ts
await build({
    entryPoints: ['src/remote-utility.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: 'dist/remote-utility.mjs',
    external: ['electron'],
    banner: {
        js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
});
```

Bundle the preload separately as sandbox-compatible CommonJS. Main may be ESM or
CommonJS; it imports `electron` at runtime.

## Verification

`yarn nx run-many -t build,typecheck,test -p remote-electron` runs the Vitest
specs, which replace only Electron's native boundary with fakes and keep the SDK
controller, vault, profile store and protocol readers real. They cover cookie
ordering, every interruption, close/forget/replacement return paths, forbidden
origins, logging, disposal and credential mediation. Real Electron journeys
remain the fixture application's Playwright evidence.
