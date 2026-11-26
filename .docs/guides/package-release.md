# Manual package release

This pipeline prepares one immutable family of the nine SDK packages, then publishes those same checked tarballs only through an explicitly selected manual release. It does not prepare version commits, create an automatic version PR, publish on push, or infer approval from a successful check. The initial source version is `0.1.0`; later versions must already be committed consistently before another manual candidate is considered.

## Published initial family

SDK `0.1.0` was published on 26 November 2026 by [Release packages run 45865646952](https://github.com/pixel-brewery/remote/actions/runs/45865646952). It reused immutable candidate artifact `15130029271` from [the successful preparation](https://github.com/pixel-brewery/remote/actions/runs/45846249443), without rebuilding or repacking. Tag [`v0.1.0`](https://github.com/pixel-brewery/remote/tree/v0.1.0) points to checked source `a2145c094007dc253b969f4c7956f43000b6a613`. All nine package records report public visibility and the canonical repository association; fresh official npm downloads matched the candidate's byte counts, SHA-256 and SHA-512 integrity. Application integration and device acceptance are separate from this package-release evidence.

## Preconditions and source proof

Use the canonical `pixel-brewery/remote` repository, ID `1472760702`, and select `main` when starting **Release packages**. Supply `source_sha` as its exact forty-character current protected commit and `family_version` as the exact stable version already present in the root and all nine SDK manifests. A dirty or different checkout, stale main, changed package identity, wrong registry or inconsistent family version fails before preparation or publication.

The original **Verify** workflow at `.github/workflows/ci.yml` must have succeeded on that exact main source. The latest matching run and its current attempt must have all three original jobs, `verify`, `android` and `ios`, completed successfully at that same head. A skipped native job, newer failed/running attempt, incomplete inventory or another workflow is not release evidence. Publication repeats these checks before the immutable tag and each registry write. Branch protection and required reviews remain intact.

Preparation may run while the repository is private. Actual publication additionally requires the authorized public repository. No new App, credential, bypass actor, automatic approval or environment approval configuration is introduced. The maintained workflow uses its existing repository `GITHUB_TOKEN` with job-scoped read permissions for preparation and contents/packages write permissions for the manually selected publisher.

## Review one candidate before publication

Start the workflow with `publish=false` and leave `candidate_artifact_id` empty. The preparation target's Nx prerequisites build the SDK. The single canonical packed-package verifier then runs Yarn workspace packing for all nine packages, inspects the actual tar inventory/manifests/LICENSE, checks the inward dependency graph and public exports, installs only those tarballs plus declared public peers into an isolated consumer, strictly type-checks every export and executes safe Node entries. Privileged/native/browser entries receive their appropriate declaration/resolution checks.

Only after all checks pass does the same verifier retain the original compressed bytes. It never packs a second publication copy. The candidate contains nine `.tgz` files plus `release-candidate.json`: format 1, repository ID, exact source, family version, producer run/attempt, verification counts and each package's name/version/filename/byte count/SHA-256/SHA-512 integrity. The successful run retains these files for thirty days as `remote-sdk-<version>-<source-sha>` and exposes the positive **GitHub Actions artifact ID**. That ID is not a local filename, source SHA or content hash.

Inspect the source, original Verify result and retained candidate before authorizing publication. A local read-only/preparation invocation can produce preview bytes, but its producer IDs are zero; a local preview cannot become a publishable Actions artifact.

## Explicitly publish the retained bytes

With owner authorization, start **Release packages** from `main` with the same source/version, `publish=true` and the original `candidate_artifact_id`. Preparation is skipped. Alternatively, an already authorized manual run can prepare and publish together by selecting `publish=true` with no retained ID.

Before download, the executor checks the exact immutable artifact ID, name, digest, expiry, repository/head-repository IDs, source/main association and genuine human-dispatched producer workflow. The downloaded manifest must identify that producer and an actual successful `prepare` job at the recorded attempt/head. Other runs, forks, bot dispatches, failed preparation, expired artifacts, extra files, symlinks, altered archives and wrong source/version fail closed. Official download-artifact addresses that producer run and artifact ID, rather than searching a mutable artifact name.

After validating the entire family and comparing all pre-existing registry versions, the publisher creates the lightweight `v<version>` tag on the exact checked source, before the first registry write. An existing identical tag is retained; another target or tag kind is a conflict. The pipeline never updates or deletes tags.

The official npm CLI publishes the retained `.tgz` files with scripts disabled, an explicit GitHub registry and public-access intent. It never publishes a source directory or rebuilds after the tag. Tokens are supplied only in the child environment through an owned temporary npm configuration; command output/errors do not expose token values or private registry bodies. Existing versions must have the same integrity and actual downloaded bytes; matching versions are skipped and conflicting versions stop the family without overwrite or deletion. See [npm publication and immutable versions](https://docs.npmjs.com/cli/v12/commands/npm-publish/) and [GitHub's npm registry authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

## Public visibility and access verification

Success requires every exact version to exist in GitHub's package-version metadata, all package records to link to the canonical repository, and fresh official npm downloads to match the candidate's byte count, SHA-256 and SHA-512 integrity. Every package record must explicitly report `visibility=public`.

Do not infer package visibility from the linked repository or `npm publish --access public` alone. If a package remains private, the upload is preserved and the pipeline reports the affected names as an owner action instead of claiming completion. An authorized owner must open each package's **Package settings** and change its visibility, then resume the original candidate. The initial `0.1.0` family already passed the explicit public-visibility checks and needed no visibility repair. The pipeline makes no ACL/visibility mutation and introduces no administrative token. [GitHub package visibility and inherited permissions](https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility).

The verified read-access policy is public visibility plus the expected repository association. GitHub's package metadata does not enumerate the complete owner/team/admin grant matrix; inspect those administrative grants in Package settings when needed. Public npm packages on GitHub still require appropriate authenticated registry access for installation. The pipeline does not fabricate anonymous installation or arbitrary cross-repository access.

## Partial upload and resumption

Retry failed jobs in the original run, or explicitly dispatch the same source/version with its original artifact ID. A timed-out upload may already exist; registry metadata and downloaded bytes determine whether it is safely skipped. Missing packages receive exactly the retained bytes. Failed/private original attempts are retained rather than deleted, versions are never overwritten, and neither a tag nor source version is moved to make a retry pass.

Current protected main must still equal the original source, including during a retry. If it advanced, this initial pipeline deliberately stops and preserves the partial upload, tag and artifacts for an explicit owner decision. It has no ancestry exception, history rewrite, automatic new version, or repack fallback. Expired/missing retained artifacts are also a blocker; a tagged family is never rebuilt by the prepare phase.

## Nx operations

The single typed executor is `@pixel-brewery/nx-tasks:package-release`, with `phase` defaulting to `preflight`, `sourceSha`, `familyVersion`, optional `artifactDirectory` (default `out/package-release`) and positive numeric `artifactId`. Its JSON schema rejects prereleases, malformed versions, extra options and noninteger IDs.

| Target                                | Prerequisites and effect                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `nx-tasks:packages:release:preflight` | Read-only source/original-CI proof and optional artifact provenance.                                         |
| `nx-tasks:packages:release:prepare`   | SDK build prerequisites, one canonical pack/consumer verification and retained candidate output.             |
| `nx-tasks:packages:release:publish`   | No build prerequisites; approved manual tag/upload using the retained artifact.                              |
| `nx-tasks:packages:release:verify`    | No build prerequisites; source, immutable artifact, tag, registry bytes and public-access verification only. |

All four targets are noncacheable. Workflow definitions alone do not prove that publication occurred; the completed initial-family run above records the executed release.
