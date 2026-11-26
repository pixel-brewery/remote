// #region Imports
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getPackedPackageDefinitions } from '../packed-packages/getPackedPackageDefinitions.js';
import type { IPackedCommandRunner } from '../packed-packages/interfaces/IPackedCommandRunner.js';
import { createReleaseEnvironment } from './createReleaseEnvironment.js';
import type { IPackageReleaseOptions } from './interfaces/IPackageReleaseOptions.js';
import type { IReleaseRequest } from './interfaces/IReleaseRequest.js';
import type { IReleaseRunIdentity } from './interfaces/IReleaseRunIdentity.js';
import { releaseFields as fields } from './releaseFields.js';
import { releasePolicy as policy } from './releasePolicy.js';
// #endregion

/**
 * Proves the exact current protected source and the latest original full Verify attempt.
 * @param root - Committed clean source checkout, with versions already prepared.
 * @param options - Exact source and stable family version.
 * @param request - Read-only GitHub evidence boundary.
 * @param command - Literal external-tool boundary for read-only Git inspection.
 * @returns The successful Verify run and attempt used as source evidence.
 * @throws An error for stale/dirty source, missing protection or incomplete checks.
 * @public
 */
export async function verifyReleaseSource(
    root: string,
    options: IPackageReleaseOptions,
    request: IReleaseRequest,
    command: IPackedCommandRunner,
): Promise<IReleaseRunIdentity> {
    assert(/^[0-9a-f]{40}$/u.test(options.sourceSha), 'Use an exact forty-character source SHA.');
    assert(
        /^(?:0|[1-9]\d*)[.](?:0|[1-9]\d*)[.](?:0|[1-9]\d*)$/u.test(options.familyVersion),
        'Use the stable family version already committed in source.',
    );
    const env = createReleaseEnvironment(process.env);
    assert.equal(
        (await command('git', ['rev-parse', 'HEAD'], root, env)).trim(),
        options.sourceSha,
        'Release checkout must equal the requested source.',
    );
    assert.equal(
        (await command('git', ['status', '--porcelain'], root, env)).trim(),
        '',
        'Release source must have no uncommitted or untracked changes.',
    );
    const workspace = fields(JSON.parse(await readFile(join(root, 'package.json'), 'utf8')));
    assert.equal(
        workspace['version'],
        options.familyVersion,
        'Root family version must already be committed.',
    );
    for (const definition of getPackedPackageDefinitions()) {
        const manifest = fields(
            JSON.parse(await readFile(join(root, definition.directory, 'package.json'), 'utf8')),
        );
        assert.equal(manifest['name'], definition.name, 'Release package identity changed.');
        assert.equal(
            manifest['version'],
            options.familyVersion,
            'All nine source versions must match.',
        );
        assert.equal(
            fields(manifest['publishConfig'])['registry'],
            policy.registry,
            'Package registry must be GitHub Packages.',
        );
        assert.equal(
            fields(manifest['publishConfig'])['access'],
            'public',
            'Packages must declare intended public access.',
        );
        assert.equal(
            fields(manifest['repository'])['url'],
            'https://github.com/' + policy.repository + '.git',
            'Package repository association changed.',
        );
    }
    const repository = fields(await request('GET', `repositories/${policy.repositoryId}`));
    assert.equal(repository['id'], policy.repositoryId);
    assert.equal(repository['full_name'], policy.repository);
    assert.equal(repository['default_branch'], 'main');
    assert.equal(repository['fork'], false);
    const main = fields(await request('GET', `${policy.repositoryPath}/branches/main`));
    assert.equal(main['name'], 'main');
    assert.equal(main['protected'], true, 'Release source must remain protected.');
    assert.equal(
        fields(main['commit'])['sha'],
        options.sourceSha,
        'Requested release source is no longer current main.',
    );
    const workflow = fields(
        await request('GET', `${policy.repositoryPath}/actions/workflows/ci.yml`),
    );
    assert(Number.isSafeInteger(workflow['id']) && Number(workflow['id']) > 0);
    assert.equal(workflow['path'], policy.verifyWorkflow);
    assert.equal(workflow['name'], policy.verifyName);
    assert.equal(workflow['state'], 'active');
    const inventory = fields(
        await request(
            'GET',
            `${policy.repositoryPath}/actions/workflows/ci.yml/runs?branch=main&head_sha=${options.sourceSha}&per_page=100`,
        ),
    );
    const runs = inventory['workflow_runs'];
    assert(
        Array.isArray(runs) &&
            Number.isSafeInteger(inventory['total_count']) &&
            Number(inventory['total_count']) > 0 &&
            Number(inventory['total_count']) <= 100 &&
            runs.length === inventory['total_count'],
        'Verify inventory must be complete.',
    );
    const candidates = runs
        .map(fields)
        .filter(
            (run) =>
                run['workflow_id'] === workflow['id'] &&
                run['head_sha'] === options.sourceSha &&
                run['head_branch'] === 'main' &&
                ['push', 'workflow_dispatch'].includes(String(run['event'])) &&
                fields(run['repository'])['id'] === policy.repositoryId &&
                fields(run['head_repository'])['id'] === policy.repositoryId &&
                (run['path'] === policy.verifyWorkflow ||
                    run['path'] === policy.verifyWorkflow + '@refs/heads/main'),
        );
    assert(candidates.length > 0, 'No original main Verify run exists for this source.');
    for (const run of candidates)
        assert(
            Number.isSafeInteger(run['id']) && Number(run['id']) > 0,
            'Invalid Verify run identity.',
        );
    const latest = candidates.sort((a, b) => Number(b['id']) - Number(a['id']))[0]!;
    const run = fields(
        await request('GET', `${policy.repositoryPath}/actions/runs/${Number(latest['id'])}`),
    );
    assert.equal(run['id'], latest['id']);
    assert.equal(run['workflow_id'], workflow['id']);
    assert.equal(run['head_sha'], options.sourceSha);
    assert.equal(run['name'], policy.verifyName);
    assert.equal(run['event'], latest['event']);
    assert(
        run['path'] === policy.verifyWorkflow ||
            run['path'] === policy.verifyWorkflow + '@refs/heads/main',
    );
    assert.equal(fields(run['repository'])['id'], policy.repositoryId);
    assert.equal(fields(run['head_repository'])['id'], policy.repositoryId);
    assert.equal(run['head_branch'], 'main');
    assert.equal(run['status'], 'completed');
    assert.equal(run['conclusion'], 'success', 'The latest original Verify attempt must succeed.');
    assert(
        Number.isSafeInteger(run['run_attempt']) && Number(run['run_attempt']) > 0,
        'Invalid Verify attempt.',
    );
    const jobs = fields(
        await request(
            'GET',
            `${policy.repositoryPath}/actions/runs/${Number(run['id'])}/attempts/${Number(run['run_attempt'])}/jobs?per_page=100`,
        ),
    );
    assert(
        Array.isArray(jobs['jobs']) && jobs['total_count'] === 3 && jobs['jobs'].length === 3,
        'Every original Verify job is required.',
    );
    const names = new Set<string>(policy.verifyJobs);
    const ids = new Set<number>();
    for (const value of jobs['jobs']) {
        const job = fields(value);
        assert(
            typeof job['name'] === 'string' && names.delete(job['name']),
            'Missing or duplicate original Verify job.',
        );
        assert(
            Number.isSafeInteger(job['id']) && Number(job['id']) > 0 && !ids.has(Number(job['id'])),
            'Invalid Verify job identity.',
        );
        ids.add(Number(job['id']));
        assert.equal(job['run_id'], run['id']);
        assert.equal(job['run_attempt'], run['run_attempt']);
        assert.equal(job['head_sha'], options.sourceSha);
        assert.equal(job['status'], 'completed');
        assert.equal(
            job['conclusion'],
            'success',
            'Skipped or failed native checks are not release proof.',
        );
    }
    assert.equal(names.size, 0);
    return { runId: Number(run['id']), attempt: Number(run['run_attempt']) };
}
