# Native mobile acceptance fixture

`yarn nx run fixture-mobile:build` packages the exact shared browser acceptance UI. It is served locally by the native SDK gateway after pairing, rather than loading privileged remote scripts.

Android contains counter and notes product flavors. Both use API24+, bundled native QR scanning and the SDK bridge activity, with distinct app IDs and Keystore namespaces. Run `yarn nx run fixture-mobile:android-compile` with JDK21/API36/Gradle8.14.3 (or an explicit local `GRADLE_BIN`). Install the desired debug APK on a device on the same selected LAN as the host. Network security permits WebView HTTP only to loopback; native CIO owns scoped LAN traffic.

iOS uses the local SDK Swift package, an application-owned native host and a recreated Capacitor bridge after local cookie installation. `yarn nx run fixture-mobile:ios-compile` builds both Counter and Notes app targets through the shared RemoteFixture scheme. Use the RemoteFixtureNotes scheme to launch Notes in Xcode. The targets supply their own `REMOTE_FIXTURE_KIND` setting and distinct bundle/app/Keychain namespaces. Purpose strings cover camera and local-network OS prompts. ATS has no global arbitrary-load exception; numeric private routes remain independently gated by the SDK. iOS17+ CIDR exceptions complement the earlier numeric-IP behavior.

Scan or paste an unexpired invitation; verify pairing, saved connection restore, open/close/forget, product reads/writes, counter SSE/WebSocket/media Range, stream cancellation and device revocation. Reopen the app to verify secure-store restoration. Native compile and shared protocol tests do not establish camera permission, LAN reachability or device-runtime acceptance; record those observations separately.
