# Remote host fixtures

Two unrelated application adapters use the same SDK: a counter with HTTP, SSE,
WebSocket and binary Range operations, and a notes collection with its own
validation, identifiers and commands. Their namespaces, capabilities, data and
authorization files stay separate.

Use the exported `createFixtureHost` factory from automated fixtures. Pass
`kind`, `storagePath`, the packaged client's `assetsPath`, and an optional
explicit private interface. The returned host is enabled; generate its invitation
with `host.createPairing()` and dispose it when the journey ends. Tests may opt
into `host: '127.0.0.1'`, `port: 0` and `allowLoopbackForTests: true`.

The LAN launcher requires application-owned storage and a new private invitation
output file. It never prints the invitation secret:

```sh
REMOTE_FIXTURE_KIND=counter \
REMOTE_FIXTURE_STORAGE=/private/path/counter-access.json \
REMOTE_FIXTURE_INVITATION=/private/path/new-counter-invitation.json \
REMOTE_FIXTURE_ASSETS=/path/to/packaged-client \
yarn nx serve fixture-host
```

The selected private endpoint descriptor is printed. The output file contains
`bootstrap` and a fragment-based `url` for the QR renderer or browser. Existing
invitation files are refused. This fixture uses HTTP explicitly; an application
can instead compose `NodeHttpsLanTransport` with its own certificate provider.

Counter commands use `POST /api/counter` with `{ "delta": 1 }`. Its read result is
`{ "value": 1 }`; `/api/events` emits `event: counter`, `/api/socket` echoes the
validated `{ "kind": "echo", "value": "text" }` protocol, and `/api/media`
supports one `bytes=start-end` range. Notes expose `GET/POST /api/notes` and
`DELETE /api/notes/:id`. The SDK never interprets either application's payloads.

`POST /api/upload` accepts up to 4 MiB with `counter:write`. It counts the
original incoming chunks without collecting the body and returns `{ bytes,
contentType }`, allowing browser fixtures to prove their natural FormData/File
upload path and multipart boundary through the same host and local gateway.
