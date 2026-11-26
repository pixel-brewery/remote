// #region Imports
import assert from 'node:assert/strict';
import type { IPackageReleaseOptions } from './interfaces/IPackageReleaseOptions.js';
import type { IReleaseRequest } from './interfaces/IReleaseRequest.js';
import { releaseFields as fields } from './releaseFields.js';
import { releasePolicy as policy } from './releasePolicy.js';
// #endregion

/**
 * Resolves an immutable artifact only from this repository's genuine manual release workflow.
 * @param options - Expected source/version and positive GitHub artifact ID.
 * @param request - Read-only GitHub metadata boundary.
 * @returns Positive producer run ID for exact cross-run download-artifact addressing.
 * @throws An error for expired, foreign, renamed, bot-owned or mismatched artifacts.
 * @public
 */
export async function verifyReleaseArtifact(
    options: IPackageReleaseOptions,
    request: IReleaseRequest,
): Promise<number> {
    assert(
        Number.isSafeInteger(options.artifactId) && Number(options.artifactId) > 0,
        'A GitHub Actions artifact ID is required.',
    );
    const artifact = fields(
        await request('GET', `${policy.repositoryPath}/actions/artifacts/${options.artifactId}`),
    );
    assert.equal(artifact['id'], options.artifactId);
    assert.equal(artifact['expired'], false);
    assert.equal(artifact['name'], `remote-sdk-${options.familyVersion}-${options.sourceSha}`);
    assert(
        Number.isSafeInteger(artifact['size_in_bytes']) &&
            Number(artifact['size_in_bytes']) > 0 &&
            Number(artifact['size_in_bytes']) < 1024 * 1024 * 1024,
    );
    assert(
        typeof artifact['digest'] === 'string' && /^sha256:[0-9a-f]{64}$/u.test(artifact['digest']),
        'Immutable artifact digest is required.',
    );
    const association = fields(artifact['workflow_run']);
    assert.equal(association['head_sha'], options.sourceSha);
    assert.equal(association['head_branch'], 'main');
    assert.equal(association['repository_id'], policy.repositoryId);
    assert.equal(association['head_repository_id'], policy.repositoryId);
    const runId = Number(association['id']);
    assert(Number.isSafeInteger(runId) && runId > 0);
    const workflow = fields(
        await request('GET', `${policy.repositoryPath}/actions/workflows/release-packages.yml`),
    );
    assert(Number.isSafeInteger(workflow['id']) && Number(workflow['id']) > 0);
    assert.equal(workflow['path'], policy.releaseWorkflow);
    assert.equal(workflow['name'], policy.releaseName);
    assert.equal(workflow['state'], 'active');
    const run = fields(await request('GET', `${policy.repositoryPath}/actions/runs/${runId}`));
    assert.equal(run['id'], runId);
    assert.equal(run['workflow_id'], workflow['id']);
    assert.equal(run['event'], 'workflow_dispatch');
    assert.equal(run['head_sha'], options.sourceSha);
    assert.equal(run['head_branch'], 'main');
    assert.equal(fields(run['repository'])['id'], policy.repositoryId);
    assert.equal(fields(run['head_repository'])['id'], policy.repositoryId);
    assert.equal(fields(run['actor'])['type'], 'User');
    assert(
        Number.isSafeInteger(fields(run['actor'])['id']) && Number(fields(run['actor'])['id']) > 0,
    );
    assert(
        run['path'] === policy.releaseWorkflow ||
            run['path'] === policy.releaseWorkflow + '@refs/heads/main',
    );
    return runId;
}
