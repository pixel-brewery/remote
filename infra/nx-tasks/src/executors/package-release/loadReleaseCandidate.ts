// #region Imports
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { getPackedPackageDefinitions } from '../packed-packages/getPackedPackageDefinitions.js';
import type { IPackedCommandRunner } from '../packed-packages/interfaces/IPackedCommandRunner.js';
import type { IPackedArchive } from '../packed-packages/interfaces/IPackedArchive.js';
import type { IPackedPackageManifest } from '../packed-packages/interfaces/IPackedPackageManifest.js';
import { verifyPackedManifest } from '../packed-packages/verifyPackedManifest.js';
import { createReleaseEnvironment } from './createReleaseEnvironment.js';
import type { IPackageReleaseOptions } from './interfaces/IPackageReleaseOptions.js';
import type { IReleaseCandidate } from './interfaces/IReleaseCandidate.js';
import type { IReleaseRequest } from './interfaces/IReleaseRequest.js';
import { releaseFields as fields } from './releaseFields.js';
import { releasePolicy as policy } from './releasePolicy.js';
import { verifyReleaseArtifact } from './verifyReleaseArtifact.js';
// #endregion

/**
 * Revalidates retained bytes and the exact successful artifact-producing attempt.
 * @param root - Same committed source owning the SDK metadata and public pins.
 * @param directory - Official download-artifact output containing only this candidate.
 * @param options - Expected source/version and actual immutable artifact ID.
 * @param request - Read-only producer and job evidence boundary.
 * @param command - Literal tar-inspection tool boundary; no install or repack occurs.
 * @returns The checked candidate ready for immutable registry comparison.
 * @throws An error for a foreign producer, altered bytes, wrong inventory or failed preparation.
 * @public
 */
export async function loadReleaseCandidate(
    root: string,
    directory: string,
    options: IPackageReleaseOptions,
    request: IReleaseRequest,
    command: IPackedCommandRunner,
): Promise<IReleaseCandidate> {
    const producer = await verifyReleaseArtifact(options, request);
    const directoryInfo = await lstat(directory);
    assert(
        directoryInfo.isDirectory() && !directoryInfo.isSymbolicLink(),
        'Candidate must be an actual artifact directory.',
    );
    const metadataPath = join(directory, 'release-candidate.json');
    const metadataInfo = await lstat(metadataPath);
    assert(
        metadataInfo.isFile() && !metadataInfo.isSymbolicLink() && metadataInfo.size < 128 * 1024,
    );
    const candidate = JSON.parse(await readFile(metadataPath, 'utf8')) as IReleaseCandidate;
    assert.equal(candidate.format, 1);
    assert.equal(candidate.repositoryId, policy.repositoryId);
    assert.equal(candidate.sourceSha, options.sourceSha);
    assert.equal(candidate.familyVersion, options.familyVersion);
    assert.equal(candidate.producerRunId, producer);
    assert(
        Number.isSafeInteger(candidate.producerAttempt) && candidate.producerAttempt > 0,
        'Local previews are never publishable workflow artifacts.',
    );
    const verification = fields(candidate.verification);
    assert.equal(verification['packages'], 9);
    assert(Number.isSafeInteger(verification['exports']) && Number(verification['exports']) > 0);
    assert(
        Number.isSafeInteger(verification['runtimeImports']) &&
            Number(verification['runtimeImports']) > 0 &&
            Number(verification['runtimeImports']) <= Number(verification['exports']),
    );
    const jobs = fields(
        await request(
            'GET',
            `${policy.repositoryPath}/actions/runs/${producer}/attempts/${candidate.producerAttempt}/jobs?per_page=100`,
        ),
    );
    assert(
        Array.isArray(jobs['jobs']) &&
            jobs['jobs'].length === jobs['total_count'] &&
            jobs['jobs'].length <= 100,
        'Preparation job inventory must be complete.',
    );
    const prepared = jobs['jobs'].map(fields).filter((job) => job['name'] === policy.prepareJob);
    assert.equal(prepared.length, 1, 'The artifact must have one genuine preparation job.');
    const preparation = prepared[0]!;
    assert(Number.isSafeInteger(preparation['id']) && Number(preparation['id']) > 0);
    assert.equal(preparation['run_id'], producer);
    assert.equal(preparation['run_attempt'], candidate.producerAttempt);
    assert.equal(preparation['head_sha'], options.sourceSha);
    assert.equal(preparation['status'], 'completed');
    assert.equal(preparation['conclusion'], 'success', 'Artifact preparation must actually pass.');
    const artifact = fields(
        await request('GET', `${policy.repositoryPath}/actions/artifacts/${options.artifactId}`),
    );
    assert.equal(artifact['id'], options.artifactId);
    const created = Date.parse(String(artifact['created_at']));
    const started = Date.parse(String(preparation['started_at']));
    const completed = Date.parse(String(preparation['completed_at']));
    assert(
        Number.isFinite(created) &&
            Number.isFinite(started) &&
            Number.isFinite(completed) &&
            created >= started &&
            created <= completed,
        'Artifact must have been created by the recorded successful preparation attempt.',
    );
    const definitions = getPackedPackageDefinitions();
    assert(Array.isArray(candidate.archives) && candidate.archives.length === definitions.length);
    const expectedFiles = [
        'release-candidate.json',
        ...definitions.map((definition) => definition.name.split('/')[1] + '.tgz'),
    ].sort();
    assert.deepEqual(
        (await readdir(directory)).sort(),
        expectedFiles,
        'Candidate may contain only the checked family and its manifest.',
    );
    const rootManifest = fields(JSON.parse(await readFile(join(root, 'package.json'), 'utf8')));
    const versions = fields(rootManifest['devDependencies']) as Record<string, string>;
    const names = new Set<string>();
    let exports = 0;
    for (const definition of definitions) {
        const matches: readonly IPackedArchive[] = candidate.archives.filter(
            (entry: IPackedArchive) => entry.name === definition.name,
        );
        assert.equal(matches.length, 1);
        const archive = matches[0]!;
        assert(!names.has(archive.name));
        names.add(archive.name);
        assert.equal(archive.version, options.familyVersion);
        assert.equal(archive.file, definition.name.split('/')[1] + '.tgz');
        assert(
            Number.isSafeInteger(archive.bytes) &&
                archive.bytes > 0 &&
                archive.bytes < 256 * 1024 * 1024,
        );
        assert(
            /^[0-9a-f]{64}$/u.test(archive.sha256) &&
                /^sha512-[A-Za-z0-9+/]{86}==$/u.test(archive.integrity),
        );
        const path = join(directory, archive.file);
        const info = await lstat(path);
        assert(
            info.isFile() && !info.isSymbolicLink() && info.size === archive.bytes,
            'Candidate archive type or size changed.',
        );
        const bytes = await readFile(path);
        assert.equal(
            createHash('sha256').update(bytes).digest('hex'),
            archive.sha256,
            'Candidate SHA-256 changed.',
        );
        assert.equal(
            'sha512-' + createHash('sha512').update(bytes).digest('base64'),
            archive.integrity,
            'Candidate integrity changed.',
        );
        const env = createReleaseEnvironment(process.env);
        const manifest = JSON.parse(
            await command('tar', ['-xOf', path, 'package/package.json'], directory, env),
        ) as IPackedPackageManifest;
        const files = (await command('tar', ['-tzf', path], directory, env))
            .trim()
            .split('\n')
            .filter(Boolean);
        assert.equal(manifest.version, options.familyVersion);
        exports += verifyPackedManifest(definition, manifest, files, versions).length;
        assert.equal(fields(fields(manifest)['publishConfig'])['registry'], policy.registry);
        assert.equal(
            fields(fields(manifest)['repository'])['url'],
            'https://github.com/' + policy.repository + '.git',
        );
    }
    assert.equal(exports, verification['exports'], 'Candidate export proof changed.');
    return candidate;
}
