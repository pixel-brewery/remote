# Desktop acceptance fixture

Build with `yarn nx run fixture-desktop:build`, then start `yarn nx run fixture-desktop:serve`. Pass `--notes` to the Electron command for the independent notes application; counter is the default. Both use the same packaged browser fixture and the real Remote Utility, Main OS vault and narrow CommonJS preload. A copied host invitation opens the content inside Electron. `--test-loopback` is an explicit local acceptance-test option only.

Main validates the actual sender frame, mediates `safeStorage`, installs the private loopback cookie and restricts renderer requests/navigation to packaged files or the selected loopback origin. Utility owns remote and local gateway sockets. Neither the generic Utility protocol nor the credential port is exposed through preload.

`yarn nx run fixture-desktop:e2e` exercises both products in real Electron, including OS-backed credential encryption, process-restart restoration, original FormData uploads and the protected in-app view. The test requires an unlocked macOS Keychain or a functioning Linux Secret Service. Linux launches request `gnome-libsecret`; a runner must provide its D-Bus session and unlocked keyring. Unavailable credential encryption or `basic_text` fails the journey. Playwright/Electron binaries and a display server are required; screenshots and receipts remain under ignored `output/playwright`.
