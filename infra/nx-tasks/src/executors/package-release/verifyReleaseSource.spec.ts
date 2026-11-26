// #region Imports
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getPackedPackageDefinitions } from '../packed-packages/getPackedPackageDefinitions.js';
import type { IPackedCommandRunner } from '../packed-packages/interfaces/IPackedCommandRunner.js';
import type { IReleaseRequest } from './interfaces/IReleaseRequest.js';
import { verifyReleaseSource } from './verifyReleaseSource.js';
// #endregion

const sourceSha = 'a'.repeat(40);
const repository = { id: 1472760702, full_name: 'pixel-brewery/remote' };

async function fixture(
    options: {
        stale?: boolean;
        failed?: boolean;
        skipped?: boolean;
        wrongAttempt?: boolean;
        wrongWorkflow?: boolean;
        incomplete?: boolean;
        foreignRun?: boolean;
    } = {},
) {
    const root = await mkdtemp(join(tmpdir(), 'remote-release-source-'));
    await writeFile(join(root, 'package.json'), JSON.stringify({ version: '0.1.0' }));
    for (const definition of getPackedPackageDefinitions()) {
        await mkdir(join(root, definition.directory), { recursive: true });
        await writeFile(
            join(root, definition.directory, 'package.json'),
            JSON.stringify({
                name: definition.name,
                version: '0.1.0',
                publishConfig: { registry: 'https://npm.pkg.github.com', access: 'public' },
                repository: { url: 'https://github.com/pixel-brewery/remote.git' },
            }),
        );
    }
    const run = {
        id: options.failed ? 72 : 71,
        workflow_id: 8,
        run_attempt: 2,
        path: '.github/workflows/ci.yml',
        name: 'Verify',
        event: 'push',
        head_sha: sourceSha,
        head_branch: 'main',
        repository,
        head_repository: options.foreignRun ? { id: 1 } : repository,
        status: 'completed',
        conclusion: options.failed ? 'failure' : 'success',
    };
    const request: IReleaseRequest = async (method, endpoint) => {
        expect(method).toBe('GET');
        if (endpoint.startsWith('repositories/'))
            return { ...repository, default_branch: 'main', fork: false };
        if (endpoint.endsWith('/branches/main'))
            return {
                name: 'main',
                protected: true,
                commit: { sha: options.stale ? 'b'.repeat(40) : sourceSha },
            };
        if (endpoint.endsWith('/actions/workflows/ci.yml'))
            return {
                id: 8,
                name: 'Verify',
                path: options.wrongWorkflow
                    ? '.github/workflows/other.yml'
                    : '.github/workflows/ci.yml',
                state: 'active',
            };
        if (endpoint.includes('/runs?'))
            return {
                total_count: options.incomplete || options.failed ? 2 : 1,
                workflow_runs: options.failed
                    ? [{ ...run, id: 71, conclusion: 'success' }, run]
                    : [run],
            };
        if (endpoint.includes('/jobs?'))
            return {
                total_count: 3,
                jobs: ['verify', 'android', 'ios'].map((name, index) => ({
                    id: index + 1,
                    name,
                    run_id: run.id,
                    run_attempt: options.wrongAttempt ? 1 : 2,
                    head_sha: sourceSha,
                    status: 'completed',
                    conclusion: options.skipped && name === 'ios' ? 'skipped' : 'success',
                })),
            };
        if (endpoint.includes('/actions/runs/')) return run;
        throw new Error('Unexpected source route.');
    };
    const command: IPackedCommandRunner = async (tool, args) => {
        expect(tool).toBe('git');
        return args[0] === 'rev-parse' ? sourceSha : '';
    };
    return { root, request, command };
}

describe('verifyReleaseSource', () => {
    it('requires all three original exact-source jobs on the current attempt', async () => {
        // Arrange
        const f = await fixture();
        try {
            // Act
            const result = await verifyReleaseSource(
                f.root,
                { sourceSha, familyVersion: '0.1.0' },
                f.request,
                f.command,
            );
            // Assert
            expect(result).toEqual({ runId: 71, attempt: 2 });
        } finally {
            await rm(f.root, { recursive: true, force: true });
        }
    });
    for (const options of [
        { stale: true },
        { failed: true },
        { skipped: true },
        { wrongAttempt: true },
        { wrongWorkflow: true },
        { incomplete: true },
        { foreignRun: true },
    ])
        it(`rejects incomplete or stale release evidence ${JSON.stringify(options)}`, async () => {
            // Arrange
            const f = await fixture(options);
            try {
                // Act and Assert
                await expect(
                    verifyReleaseSource(
                        f.root,
                        { sourceSha, familyVersion: '0.1.0' },
                        f.request,
                        f.command,
                    ),
                ).rejects.toThrow();
            } finally {
                await rm(f.root, { recursive: true, force: true });
            }
        });
    it('rejects malformed versions before touching GitHub or any writable boundary', async () => {
        // Arrange
        const f = await fixture();
        try {
            // Act and Assert
            await expect(
                verifyReleaseSource(
                    f.root,
                    { sourceSha, familyVersion: '0x1x0' },
                    async () => {
                        throw new Error('Must not call GitHub.');
                    },
                    f.command,
                ),
            ).rejects.toThrow('stable family version');
        } finally {
            await rm(f.root, { recursive: true, force: true });
        }
    });
});
