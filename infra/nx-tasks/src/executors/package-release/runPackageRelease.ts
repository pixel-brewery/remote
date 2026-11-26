// #region Imports
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { runPackedCommand } from '../packed-packages/runPackedCommand.js';
import { verifyPackedPackages } from '../packed-packages/verifyPackedPackages.js';
import { ensureReleaseTag } from './ensureReleaseTag.js';
import type { IPackageReleaseOptions } from './interfaces/IPackageReleaseOptions.js';
import type { IReleaseCandidate } from './interfaces/IReleaseCandidate.js';
import type { IReleaseDependencies } from './interfaces/IReleaseDependencies.js';
import { loadReleaseCandidate } from './loadReleaseCandidate.js';
import { operateReleaseRegistry } from './operateReleaseRegistry.js';
import { releaseFields as fields } from './releaseFields.js';
import { releasePolicy as policy } from './releasePolicy.js';
import { requestReleaseGitHub } from './requestReleaseGitHub.js';
import { verifyManualReleaseRun } from './verifyManualReleaseRun.js';
import { verifyReleaseArtifact } from './verifyReleaseArtifact.js';
import { verifyReleaseSource } from './verifyReleaseSource.js';
// #endregion

/**
 * Runs explicit read-only/preparation phases or a separately approved immutable release.
 * @param root - Nx workspace root containing the exact committed source.
 * @param options - Closed executor contract; source versions are never modified.
 * @param dependencies - Official tools/API by default; injected boundaries for offline checks.
 * @returns Credential-free phase, source, version and immutable artifact evidence.
 * @throws An error on incomplete proof, conflicting content, partial upload or private ACL.
 * @public
 */
export async function runPackageRelease(
    root: string,
    options: IPackageReleaseOptions,
    dependencies: IReleaseDependencies = {
        command: runPackedCommand,
        request: requestReleaseGitHub,
        environment: process.env,
    },
): Promise<Readonly<Record<string, unknown>>> {
    const { request, command, environment } = dependencies;
    const phase = options.phase ?? 'preflight';
    assert(
        ['preflight', 'prepare', 'publish', 'verify'].includes(phase),
        'Unsupported release phase.',
    );
    const evidence = await verifyReleaseSource(root, options, request, command);
    const artifactRunId =
        options.artifactId === undefined
            ? undefined
            : await verifyReleaseArtifact(options, request);
    const report = {
        phase,
        sourceSha: options.sourceSha,
        familyVersion: options.familyVersion,
        verificationRunId: evidence.runId,
        verificationAttempt: evidence.attempt,
        ...(artifactRunId ? { artifactRunId } : {}),
    };
    if (phase === 'preflight') return report;
    const directory = resolve(root, options.artifactDirectory ?? 'out/package-release');
    if (phase === 'prepare') {
        assert(
            options.artifactId === undefined,
            'Retained artifacts must be reused without preparation or repacking.',
        );
        let tagExists = false;
        try {
            await request('GET', `${policy.repositoryPath}/git/ref/tags/v${options.familyVersion}`);
            tagExists = true;
        } catch (error) {
            if (fields(error)['status'] !== 404) throw error;
        }
        assert(
            !tagExists,
            'A tag already exists. Resume the original retained artifact; never rebuild a tagged family.',
        );
        const producer =
            environment['GITHUB_ACTIONS'] === 'true'
                ? await verifyManualReleaseRun(options, request, environment, false)
                : { runId: 0, attempt: 0 };
        assert(
            !('artifactId' in producer) || producer.artifactId === undefined,
            'An owner-selected retained artifact must be reused without preparation.',
        );
        await mkdir(dirname(directory), { recursive: true });
        const verified = await verifyPackedPackages(root, command, { retainDirectory: directory });
        assert(verified.archives && verified.archives.length === 9);
        const candidate: IReleaseCandidate = {
            format: 1,
            repositoryId: policy.repositoryId,
            sourceSha: options.sourceSha,
            familyVersion: options.familyVersion,
            producerRunId: producer.runId,
            producerAttempt: producer.attempt,
            verification: {
                packages: verified.packages,
                exports: verified.exports,
                runtimeImports: verified.runtimeImports,
            },
            archives: verified.archives,
        };
        await writeFile(
            join(directory, 'release-candidate.json'),
            JSON.stringify(candidate, null, 2) + '\n',
            { flag: 'wx', mode: 0o600 },
        );
        return {
            ...report,
            packages: 9,
            directory,
            publishableWorkflowArtifact: producer.runId > 0,
        };
    }
    const candidate = await loadReleaseCandidate(root, directory, options, request, command);
    if (phase === 'publish') {
        const approval = await verifyManualReleaseRun(options, request, environment, true);
        assert(
            approval.artifactId !== undefined || candidate.producerRunId === approval.runId,
            'A candidate from another run must be explicitly selected by its immutable artifact ID.',
        );
    } else await ensureReleaseTag(options, request, false);
    const beforeWrite = async (): Promise<void> => {
        await verifyManualReleaseRun(options, request, environment, true);
        await verifyReleaseSource(root, options, request, command);
        const repository = fields(await request('GET', `repositories/${policy.repositoryId}`));
        assert.equal(
            repository['visibility'],
            'public',
            'Public package release requires the authorized public repository.',
        );
        assert.equal(repository['private'], false);
        await ensureReleaseTag(options, request, true);
    };
    const packages = await operateReleaseRegistry(
        directory,
        candidate,
        request,
        command,
        environment,
        phase === 'publish',
        beforeWrite,
    );
    await verifyReleaseSource(root, options, request, command);
    return { ...report, packages: packages.length, tag: 'v' + options.familyVersion, public: true };
}
