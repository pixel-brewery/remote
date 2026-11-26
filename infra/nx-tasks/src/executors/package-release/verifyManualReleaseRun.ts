// #region Imports
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { IPackageReleaseOptions } from './interfaces/IPackageReleaseOptions.js';
import type { IReleaseRequest } from './interfaces/IReleaseRequest.js';
import type { IReleaseRunIdentity } from './interfaces/IReleaseRunIdentity.js';
import { releaseFields as fields } from './releaseFields.js';
import { releasePolicy as policy } from './releasePolicy.js';
// #endregion

/**
 * Proves a genuine human dispatch and requires its explicit publication selection for writes.
 * @param options - Expected source and already prepared family version.
 * @param request - Actual GitHub workflow/run metadata boundary.
 * @param env - Bootstrap context; never forwarded wholesale to npm.
 * @param publication - True only before tags or registry writes.
 * @returns The actual current manual Actions run identity.
 * @throws An error for another repository, ref, actor, event, attempt or input.
 * @public
 */
export async function verifyManualReleaseRun(
    options: IPackageReleaseOptions,
    request: IReleaseRequest,
    env: Readonly<NodeJS.ProcessEnv>,
    publication: boolean,
): Promise<IReleaseRunIdentity> {
    assert.equal(
        env['GITHUB_EVENT_NAME'],
        'workflow_dispatch',
        'Publication requires an explicit manual dispatch.',
    );
    assert.equal(env['GITHUB_REPOSITORY'], policy.repository);
    assert.equal(env['GITHUB_REPOSITORY_ID'], String(policy.repositoryId));
    assert.equal(env['GITHUB_REF'], 'refs/heads/main');
    assert.equal(env['GITHUB_SHA'], options.sourceSha);
    assert(env['GITHUB_EVENT_PATH'], 'Actual dispatch event is required.');
    const event = fields(JSON.parse(await readFile(env['GITHUB_EVENT_PATH'], 'utf8')));
    const inputs = fields(event['inputs']);
    assert.equal(inputs['source_sha'], options.sourceSha);
    assert.equal(inputs['family_version'], options.familyVersion);
    assert.equal(fields(event['repository'])['id'], policy.repositoryId);
    const selected = inputs['candidate_artifact_id'];
    let artifactId: number | undefined;
    if (selected !== undefined && selected !== '') {
        assert(
            typeof selected === 'string' && /^[1-9][0-9]*$/u.test(selected),
            'The selected artifact ID must be a positive integer.',
        );
        artifactId = Number(selected);
        assert(Number.isSafeInteger(artifactId) && artifactId > 0);
        if (publication)
            assert.equal(
                options.artifactId,
                artifactId,
                'Publication artifact differs from the owner-selected candidate.',
            );
    }
    if (publication) {
        assert(
            inputs['publish'] === true || inputs['publish'] === 'true',
            'The owner must explicitly select publication.',
        );
        assert(
            env['GITHUB_TOKEN'],
            'Only the existing workflow token supplies publication authority.',
        );
    }
    const workflow = fields(
        await request('GET', `${policy.repositoryPath}/actions/workflows/release-packages.yml`),
    );
    assert(Number.isSafeInteger(workflow['id']) && Number(workflow['id']) > 0);
    assert.equal(workflow['path'], policy.releaseWorkflow);
    assert.equal(workflow['name'], policy.releaseName);
    assert.equal(workflow['state'], 'active');
    const runId = Number(env['GITHUB_RUN_ID']);
    const attempt = Number(env['GITHUB_RUN_ATTEMPT']);
    assert(
        Number.isSafeInteger(runId) && runId > 0 && Number.isSafeInteger(attempt) && attempt > 0,
        'Invalid manual run identity.',
    );
    const run = fields(await request('GET', `${policy.repositoryPath}/actions/runs/${runId}`));
    assert.equal(run['id'], runId);
    assert.equal(run['run_attempt'], attempt);
    assert.equal(run['workflow_id'], workflow['id']);
    assert.equal(run['event'], 'workflow_dispatch');
    assert.equal(run['head_sha'], options.sourceSha);
    assert.equal(run['head_branch'], 'main');
    assert.equal(fields(run['repository'])['id'], policy.repositoryId);
    assert.equal(fields(run['head_repository'])['id'], policy.repositoryId);
    assert.equal(
        fields(run['actor'])['type'],
        'User',
        'Service bots cannot grant manual publication approval.',
    );
    assert.equal(fields(event['sender'])['id'], fields(run['actor'])['id']);
    assert(
        Number.isSafeInteger(fields(run['actor'])['id']) && Number(fields(run['actor'])['id']) > 0,
    );
    assert(
        run['path'] === policy.releaseWorkflow ||
            run['path'] === policy.releaseWorkflow + '@refs/heads/main',
    );
    return { runId, attempt, ...(artifactId === undefined ? {} : { artifactId }) };
}
