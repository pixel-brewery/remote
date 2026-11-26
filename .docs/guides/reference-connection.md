# Connection lifecycle

The host is enabled explicitly. It selects an allowed private interface and
publishes its current endpoint only once ready. A pairing request carries the
current host/app identity and a bounded challenge. The resulting credential is
specific to one device and installation.

Restore an existing session before asking for another pairing. Distinguish an
unreachable host, an incompatible protocol, a revoked device and a failed product
query. Reconnect event channels with bounded backoff and ask the product to
reconcile its read model. Do not replay a business command after a lost response.

Multiple connections may coexist. Each has independent cancellation, product
state and credentials. Switching the active host first tears down the old view
and requests, then bootstraps the new projection. No old asynchronous result may
populate the new host's state.

Without DNS/discovery, a browser cannot find a changed LAN address automatically.
Opening the new pairing address is the re-entry path. Native profile storage can
retain logical identity while an explicitly supplied endpoint is updated.

Disabling access stops listeners and active streams while retaining approved
device records for later re-enabling. Process disposal closes owned resources
without clearing the operator's enabled preference. Unfinished challenges do not
survive shutdown/rebind. Revocation is separate from a normal disconnect.
