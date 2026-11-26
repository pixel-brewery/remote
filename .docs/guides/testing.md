# Testing and verification

## Evidence levels

Source implementation, package builds, automated integration, native compilation,
device journeys and publication are distinct evidence. Do not infer a later level
from an earlier one. Current task evidence is updated after commands actually run.

## Commands

```sh
yarn agents:check
yarn agents:mcp-check
yarn build
yarn typecheck
yarn test
yarn docs
yarn docs:check
```

Tests are colocated `.spec.ts` files with Vitest and explicit arrange/act/assert
sections. Browser/Electron journeys belong to their fixture applications. Native
sources have platform tests and compiled fixtures. Tests use temporary stores and
synthetic operations; never modify application databases or user credentials.

## Native compiler and tooling API

Build and typecheck tasks invoke the native TypeScript `7.0.2` CLI. The root and
Nx tooling workspace both declare `@typescript/native` as the exact published
`npm:typescript@7.0.2` alias, which provides `tsc`. Tools that import `typescript`
instead resolve `npm:@typescript/typescript6@6.0.2`, Microsoft's published API
compatibility package. Its locked API implementation is TypeScript `6.0.3` and
its separate executable is `tsc6`; ordinary build/typecheck tasks do not use it.
This follows the official [Microsoft migration](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
and [Nx compatibility contract](https://nx.dev/docs/kb/typescript-7).

Check the actual executables after a regular immutable installation:

```sh
yarn exec tsc --version
yarn exec tsc6 --version
```

The first command must report `7.0.2`; the second reports the locked API's `6.0.3`.
Nx project analysis, TypeDoc and the repository's AST checks use the API package.
The packed-package verifier resolves the native package's published CLI, checks
its `--version` against the exact native pin, and then typechecks the same real
isolated consumer with strict NodeNext resolution and `skipLibCheck: false`.
Missing native tooling or an API compiler substituted for it fails verification;
the verifier never falls back to the workspace API compiler or SDK path aliases.

## Required cases

- Expired/replayed pairing and interrupted pairing recovery.
- App/host isolation and unknown-operation rejection.
- Failed durable grant/revoke and immediate stream revocation.
- Host replacement during requests and disposal during reconnect.
- HTTP-safe random IDs, cookie restoration and fragment cleanup.
- POST/multipart, SSE, WebSocket, binary content, HEAD and Range.
- Cancellation, bounded buffering and no replay of uncertain writes.
- Protected local native callers and rejection of arbitrary destinations.
- Application-supplied TLS and certificate replacement.
- Packed exports/declarations independent of workspace aliases.
- Real browser LAN origin plus Electron/Android/iOS platform journeys.

## Verified implementation record — 2026-11-26

The current source family is `0.1.0`. These results are actual executed checks;
publication and consumer completion are not inferred from them.

| Boundary                 | Executed evidence                                                                                                                                                                                                                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace                | Full `yarn verify`: agent projections and immutable skill pins, real local MCP, source/TSDoc/index conventions, formatting, builds, strict types, tests, native-resource drift, packed consumers and API drift all passed.                                                                                                                     |
| Public API               | Strict TypeDoc generation and read-only verification passed for all 16 entry points. Interface members now require their own multiline documentation and separate access tags.                                                                                                                                                                 |
| Published artifact shape | All nine real Yarn tarballs installed in an isolated consumer; 25 export specifiers, strict declaration checking without workspace aliases, nine safe runtime imports, licenses and inward dependencies passed.                                                                                                                                |
| Native contracts         | Eleven canonical schemas, 39 accepted/rejected wire/content-policy vectors and 14 route-match vectors are generated from the shared owners and consumed by both native platforms.                                                                                                                                                              |
| Android SDK              | Actual AAR compilation and seven JUnit tests passed under AGP9.5.3/KGP2.4.21/Gradle9.6.0/JDK21/API36/BuildTools36.0.0: zero failures/errors/skips, including canonical vectors, private-peer checks, independent content-policy flags and the configured upload ceiling.                                                                       |
| iOS SDK                  | The actual `PixelBreweryRemote-Package` simulator scheme ran eleven XCTest cases: eleven passed, zero failed/skipped. This includes cookies, streamed upload/cancellation, canonical vectors, content policy and quota boundaries. Xcode emits local toolchain diagnostics; those are not reported as a warning-free compiler run.             |
| Native fixtures          | Counter and Notes Android APKs compiled with the same AGP9 toolchain; each archive's web assets and Capacitor configuration matched the Nx output byte-for-byte. Both iOS simulator application targets compiled during implementation. CI repeats compilation at the exact committed head.                                                    |
| Browser fixtures         | Both products passed real Chromium pairing, reads/writes, original FormData upload, SSE, WebSocket, Range, restore and revocation journeys, with light/dark appearance, narrow layout and keyboard checks. The local run was explicitly labelled loopback.                                                                                     |
| Electron                 | Source builds, strict declarations, lifecycle/admission tests and actual process startup passed. The local macOS happy path stopped at a genuine OS Keychain permission gate; no mock/plaintext backend or successful Mac credential journey is claimed. Linux CI provisions a real isolated libsecret service and must pass the full journey. |
| Release tooling          | The manual-only publisher and retained packing path passed offline source/attempt/artifact/tag/byte-integrity/public-visibility rejection tests. No tag or registry upload is implied by these tests.                                                                                                                                          |
| Site                     | Production assets, 1800/390 px layout, keyboard skip/package navigation and no browser console errors were inspected in the existing Chrome session. [Design evidence](../design/verification.md) separates catalog, source and runtime results.                                                                                               |

## Network and device limits

This machine currently has no usable RFC1918/ULA interface. Local browser evidence
therefore uses only the explicit `REMOTE_FIXTURE_ALLOW_LOOPBACK=1` fixture mode.
The normal/CI journey still selects an actual private LAN address and asserts
`isSecureContext === false`; a loopback pass cannot replace that evidence.
LAN journeys use the host's bounded private port range. Port zero remains limited
to the explicitly selected loopback test mode; using it for a real private interface
would reject fixture startup before the browser or Electron journey begins.

Native compilation and simulator unit tests do not prove camera hardware, LAN
permission prompts, background/suspension on a real phone, or an OS credential
approval completed by the user. Those journeys remain separately named acceptance
work. Never remove a platform gate or count a pending permission as success.

## Reproduce the platform checks

Use the actual Nx targets `remote-capacitor:android-compile`,
`remote-capacitor:ios-compile` and `remote-capacitor:ios-test`. Android uses JDK 21,
AGP 9.5.3, Gradle 9.6.0, Android API 36 and SDK Build Tools 36.0.0. The Gradle and
Build Tools requirements follow Google's [AGP 9.5 compatibility table](https://developer.android.com/build/releases/agp-9-5-0-release-notes#compatibility).
Set `GRADLE_BIN` only when an existing matching wrapper supplies Gradle 9.6.0. The iOS task selects an available
installed iPhone simulator without creating another one; an explicit
`REMOTE_IOS_DESTINATION` can select an existing device.

Capacitor 8 requires Xcode 26 or later. The iOS CI job uses the supported
`macos-15` ARM64 image and explicitly selects
`DEVELOPER_DIR=/Applications/Xcode_26.3.app/Contents/Developer`; the image's older
default Xcode is insufficient. Xcode 26.3 supplies Swift 6.2 and the iOS 26.2
simulator SDK. The job reports the selected Xcode and Swift versions, then runs
the same SDK compile, all simulator tests and both fixture app builds. The
`ios` required check, timeout and read-only token permissions remain unchanged.

The library and Counter/Notes fixture use [built-in Kotlin](https://developer.android.com/build/migrate-to-built-in-kotlin),
with no separate `org.jetbrains.kotlin.android` application or opt-out flags. Both
native Gradle entry points select KGP 2.4.21 through Google's documented
[compiler classpath contract](https://developer.android.com/build/releases/agp-9-0-0-release-notes#upgrade-to-a-higher-kgp-version).
The Java/Kotlin 21 targets, API 36 and Android 24 minimum remain unchanged.

Capacitor 8.6.2 retains its own unchanged AGP 8.13.0 buildscript. Its inclusion in
the AGP 9.5.3 SDK AAR/seven JVM tests and both Counter/Notes APK builds passed on
2026-11-26. This is executed build evidence for the pinned combination, not a
Capacitor-major migration. The [Capacitor 9 plugin guide](https://next.capacitorjs.com/docs/next/updating/plugins/9-0)
explains built-in Kotlin and additional major-version changes; those changes are
not silently applied to the pinned Capacitor 8 integration. Likewise,
[JetBrains' fully tested matrix](https://kotlinlang.org/docs/gradle-configure-project.html)
covers KGP 2.4.21 with Gradle through 9.7.0 but AGP only through 9.3.1; the actual
targets provide this project's AGP 9.5.3 evidence rather than a broader vendor
support guarantee. Repeat both native targets after toolchain changes. Preserve any failing output;
do not introduce vendor patches, `android.builtInKotlin=false` or legacy-DSL opt-outs
to turn an incompatible build into a pass.

The fixture's existing Gradle Sync copies Nx-produced assets and configuration
into the APK. Its generated-directory property maps the Sync TaskProvider's
destination, and both variants register that output with
`addGeneratedSourceDirectory`. A free-standing directory property can lose the
producer dependency and create successfully compiled APKs without their web
application. Archive checks must verify `assets/public/index.html`, the remaining
Nx-produced assets and `assets/capacitor.config.json`, not only APK existence.

`fixture-mobile:android-compile` builds both application flavors;
`fixture-mobile:ios-compile` builds both product application targets. Browser and
Electron acceptance use their actual TypeScript Playwright configurations through
`fixture-browser:e2e` and `fixture-desktop:e2e`.

Linux Electron acceptance requires the documented real dbus/libsecret service.
macOS uses the user's real Keychain and may require an OS-owned approval. The
fixture rejects `basic_text` and removes Playwright's mock-keychain switch; a
permission failure remains visible instead of being converted into a test pass.

The published Mosaik `0.1.205` declaration graph has a recorded strict-consumer
issue ([Mosaik #1397](https://github.com/RueDeRennes/mosaik/issues/1397)). Native Web
Component registration in the current `0.1.213` integration retains its ordinary JavaScript runtime boundary; all owned
connection, application and acceptance contracts remain strict TypeScript. No
vendor file, declaration suppression or global `skipLibCheck` was introduced to
hide this application failure.

## Verified dependency delivery

The default-branch Dependabot controller installs no pull-request dependencies
and loads no pull-request implementation. Its branch/merge writer and its native
CI authorizer are separate jobs. Authorization has only Actions write plus
Contents and Pull Requests read permissions, and cannot update a branch or merge.

Only the actual `pull_request` workflow is merge evidence. It must belong to the
same immutable repository and current bot PR, match the current source and
workflow attempt, and successfully complete exactly `verify`, `android` and
`ios`. A human maintainer may have triggered a valid normal PR run. A diagnostic
`workflow_dispatch` run never satisfies this proof. The authorizer only approves
an `action_required` original run from the verified native bot identities after
rechecking the current main/head/test-merge parents, source blobs and refs.

`.github/dependabot-automation.json` contains the fixed `reviewedCiSha256`
attestation for the complete deliberately reviewed CI source. The canonical
`pinInvariant` normalization replaces only ordinary immutable action-pin/version
comment values; all other source bytes remain significant. The controller hashes
that normalized main source and requires equality with the fixed trusted-main
value and the normalized PR source. It never learns an attestation from API data,
PR configuration or workflow input. A CI logic, permission or toolchain change
requires a deliberate review and corresponding literal policy update before it
can authorize later native PR runs.

Scheduled reconciliation revisits already-green native runs through the complete
merger after a transient skip. Current attempts remain authoritative even when an
unrelated diagnostic run has a larger ID. After merging, continuation requires a
full confirmed merged-PR response and the exact current destination source.
Existing same-source main push or dispatch runs are retained in any state,
including failed, cancelled or queued runs, rather than duplicated. This
automation does not publish the SDK family; package publication retains the
separate owner-controlled release workflow.
