# Remote documentation

| Goal                                | Guide                                                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Integrate a host or client          | [Integration](guides/integrate-remote.md)                                                             |
| Understand pairing and recovery     | [Connection lifecycle](guides/reference-connection.md)                                                |
| Run verification                    | [Testing](guides/testing.md)                                                                          |
| Maintain the public API             | [API documentation](guides/api-documentation.md)                                                      |
| Understand the binding architecture | [Implementation contract](plan.md)                                                                    |
| Implement the complete runtime      | [Remote access handbook](architecture/remote-access/README.md)                                        |
| Audit the repository baseline       | [Cursor reference](reference.json)                                                                    |
| Inspect the design consultation     | [Catalog evidence](design/catalog-evidence.json) and [interface verification](design/verification.md) |

See [package release and recovery](guides/package-release.md) for the separately authorized publication workflow.

## Runtime entry points

Portable packages are `remote-protocol`, `remote-core` and `remote-client`.
`remote-browser` implements browser I/O. `remote-node` exposes host/client,
persistence and security entry points. Electron separates Main, preload and
utility-process entry points. Capacitor includes its native platform sources.
Angular projects the shared session into framework lifecycle and Signals.
`remote-testing` is a test dependency.

Generated API references live under `packages/<package>/api/` and `api/`.
Their owner is the TypeDoc Nx executor; edit declarations and TSDoc rather than
generated output. Native platform responsibilities are also documented in prose,
because TypeDoc cannot describe Kotlin and Swift implementation by itself.

## Agent configuration

Root `AGENTS.md`, `.agents/config.json`, derived skills and `.vscode/mcp.json`
are canonical. Generated provider adapters are checked for drift. Pinned
Architecture and Designer foundations retain their original content hashes.
Product-specific instructions live in Remote's derived references.

## Current state and target

The repository is implementing the contract in `plan.md`. Execution evidence is
recorded in the testing guide. Consumer integration and publication are distinct
from SDK source availability; neither is inferred from a package manifest.
