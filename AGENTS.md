# Pixel Brewery Remote agent guide

Pixel Brewery Remote provides product-neutral device pairing, scoped remote access, streaming transports and browser, Electron and Capacitor clients. [The implementation contract](.docs/plan.md) defines the runtime and its acceptance evidence.

## Required skills

- Before every repository task, read and apply [Remote Architect](.agents/skills/remote-architect/SKILL.md), its pinned [Pixel Brewery Architect base](.agents/skills/architect/SKILL.md) and the applicable reference modules.
- Before proposing, implementing or reviewing a UI or interaction decision, apply [Remote Designer](.agents/skills/remote-designer/SKILL.md). It loads the pinned [Pixel Brewery Designer base](.agents/skills/designer/SKILL.md) and the shared Mosaik catalog workflow. Record the catalog and runtime evidence required by that workflow.
- Keep project-specific rules in the derived skills. Keep the installed upstream skills intact. Update them via Skills CLI at an explicitly reviewed full commit and retain its generated content hashes.

## Agent configuration

- Maintain shared instructions here, canonical roles in the agent configuration, and tool declarations in [.vscode/mcp.json](.vscode/mcp.json). Run `yarn agents:sync` after edits to these sources or the skills.
- Read skill references from their canonical directories. Verify projections with `yarn agents:check` and verify the installed Mosaik tools with `yarn agents:mcp-check`.
- Keep secrets in the calling environment. Project adapters inherit the client's permission, approval and sandbox policy.

## Workspace and delivery

- Work in the designated primary checkout. Obtain the owner's explicit approval for any additional worktree. Keep parallel edits disjoint and assign one owner for staging, commits and refs.
- Follow the installed toolchain and package boundaries. Each package publishes a narrow public API. Tests cover observable behavior, authority, lifecycle and scope boundaries.
- Organize reusable libraries under `libs/`, reference applications under `apps/`, and authored architecture and guides under `.docs/`.
- Run the local Ship-it review when available before opening any pull request. Respect the actual GitHub rules and owner instructions for commits, pushes, releases and publication.
- Root owns Git staging, commits and refs in this checkout. Workers edit disjoint assigned package directories and never revert concurrent work.
- Keep protocol/core/client free of Node, Electron, Angular, Capacitor and product models. Adapters depend inward. Every trust-boundary request and response uses the canonical protocol schemas.
- Applications own their business operations, asset roots, storage locations and certificate supply. Never embed product domains, certificates, private keys, issuer credentials or an SDK-hosted control service.
- HTTP LAN is an explicit unencrypted mode. Bind one selected private interface, deny unknown routes and redirects, bound resources and cancel device-owned streams on revocation.
- Preserve Node Utility Process ownership of desktop network activity. Main mediates OS credentials; renderer and WebView receive no remote credential or arbitrary proxy capability.
- Native clients serve packaged application assets through a protected loopback gateway; do not run remote scripts with a privileged native bridge.
- Use lowercase responsibility directories and group implementation by cohesive feature. Every interface has its own matching file under the owning feature's `interfaces/`; every abstract class belongs in its feature's `abstracts/`, at every nesting depth. Keep platform-required native layouts intact.
- Use English documentation, colocated meaningful tests, import regions, I-prefixed interfaces, explicit member visibility and Fields/Ctor/Properties/Methods regions. Write multiline English TSDoc for public declarations and public/protected members, including interface members. Put access tags on separate lines and document parameters, results, errors, defaults and lifecycle accurately. Generate the API reference from these sources.
- Verify folder casing in the filesystem and Git index. Use an intermediate name for a case-only rename on case-insensitive filesystems; never change Git's case handling to conceal a mismatch.
- Run focused checks before the full verification. Publication and deployment remain separate owner-controlled steps; ordinary authorized merges may trigger existing workflows.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
