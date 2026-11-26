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
| Android SDK              | Actual AAR compilation and seven JUnit tests passed: zero failures/errors/skips, including canonical vectors, private-peer checks, independent content-policy flags and the configured upload ceiling.                                                                                                                                         |
| iOS SDK                  | The actual `PixelBreweryRemote-Package` simulator scheme ran eleven XCTest cases: eleven passed, zero failed/skipped. This includes cookies, streamed upload/cancellation, canonical vectors, content policy and quota boundaries. Xcode emits local toolchain diagnostics; those are not reported as a warning-free compiler run.             |
| Native fixtures          | Counter and Notes Android APKs and both iOS simulator application targets compiled during implementation. CI repeats their compilation at the exact committed head.                                                                                                                                                                            |
| Browser fixtures         | Both products passed real Chromium pairing, reads/writes, original FormData upload, SSE, WebSocket, Range, restore and revocation journeys, with light/dark appearance, narrow layout and keyboard checks. The local run was explicitly labelled loopback.                                                                                     |
| Electron                 | Source builds, strict declarations, lifecycle/admission tests and actual process startup passed. The local macOS happy path stopped at a genuine OS Keychain permission gate; no mock/plaintext backend or successful Mac credential journey is claimed. Linux CI provisions a real isolated libsecret service and must pass the full journey. |
| Release tooling          | The manual-only publisher and retained packing path passed offline source/attempt/artifact/tag/byte-integrity/public-visibility rejection tests. No tag or registry upload is implied by these tests.                                                                                                                                          |
| Site                     | Production assets, 1800/390 px layout, keyboard skip/package navigation and no browser console errors were inspected in the existing Chrome session. [Design evidence](../design/verification.md) separates catalog, source and runtime results.                                                                                               |

## Network and device limits

This machine currently has no usable RFC1918/ULA interface. Local browser evidence
therefore uses only the explicit `REMOTE_FIXTURE_ALLOW_LOOPBACK=1` fixture mode.
The normal/CI journey still selects an actual private LAN address and asserts
`isSecureContext === false`; a loopback pass cannot replace that evidence.

Native compilation and simulator unit tests do not prove camera hardware, LAN
permission prompts, background/suspension on a real phone, or an OS credential
approval completed by the user. Those journeys remain separately named acceptance
work. Never remove a platform gate or count a pending permission as success.

## Reproduce the platform checks

Use the actual Nx targets `remote-capacitor:android-compile`,
`remote-capacitor:ios-compile` and `remote-capacitor:ios-test`. Android uses JDK 21,
Gradle 8.14.3 and the declared Android SDK/build tools. Set `GRADLE_BIN` only when
an existing matching wrapper supplies Gradle. The iOS task selects an available
installed iPhone simulator without creating another one; an explicit
`REMOTE_IOS_DESTINATION` can select an existing device.

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
Component registration uses its ordinary JavaScript runtime boundary; all owned
connection, application and acceptance contracts remain strict TypeScript. No
vendor file, declaration suppression or global `skipLibCheck` was introduced to
hide this application failure.
