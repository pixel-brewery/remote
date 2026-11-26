// #region Imports
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { IReleaseRequest } from './interfaces/IReleaseRequest.js';
import { verifyManualReleaseRun } from './verifyManualReleaseRun.js';
// #endregion

const sourceSha = 'a'.repeat(40);

async function fixture(
    options: { publish?: boolean; bot?: boolean; wrongAttempt?: boolean; selected?: string } = {},
) {
    const root = await mkdtemp(join(tmpdir(), 'remote-release-event-'));
    const eventPath = join(root, 'event.json');
    await writeFile(
        eventPath,
        JSON.stringify({
            inputs: {
                source_sha: sourceSha,
                family_version: '0.1.0',
                publish: options.publish ?? true,
                candidate_artifact_id: options.selected ?? '',
            },
            repository: { id: 1472760702 },
            sender: { id: 7 },
        }),
    );
    const environment = {
        GITHUB_EVENT_NAME: 'workflow_dispatch',
        GITHUB_REPOSITORY: 'pixel-brewery/remote',
        GITHUB_REPOSITORY_ID: '1472760702',
        GITHUB_REF: 'refs/heads/main',
        GITHUB_SHA: sourceSha,
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_RUN_ID: '200',
        GITHUB_RUN_ATTEMPT: '2',
        GITHUB_TOKEN: 'unit-token',
    };
    const request: IReleaseRequest = async (method, endpoint) => {
        expect(method).toBe('GET');
        if (endpoint.endsWith('/actions/workflows/release-packages.yml'))
            return {
                id: 8,
                name: 'Release packages',
                path: '.github/workflows/release-packages.yml',
                state: 'active',
            };
        return {
            id: 200,
            run_attempt: options.wrongAttempt ? 1 : 2,
            workflow_id: 8,
            event: 'workflow_dispatch',
            head_sha: sourceSha,
            head_branch: 'main',
            repository: { id: 1472760702 },
            head_repository: { id: 1472760702 },
            actor: { id: 7, type: options.bot ? 'Bot' : 'User' },
            path: '.github/workflows/release-packages.yml',
        };
    };
    return { root, environment, request };
}

describe('verifyManualReleaseRun', () => {
    it('requires actual matching human-run metadata plus explicit publication input', async () => {
        // Arrange
        const f = await fixture();
        try {
            // Act
            const result = await verifyManualReleaseRun(
                { sourceSha, familyVersion: '0.1.0' },
                f.request,
                f.environment,
                true,
            );
            // Assert
            expect(result).toEqual({ runId: 200, attempt: 2 });
        } finally {
            await rm(f.root, { recursive: true, force: true });
        }
    });
    for (const options of [
        { publish: false },
        { bot: true },
        { wrongAttempt: true },
        { selected: '100' },
    ])
        it(`withholds publication approval ${JSON.stringify(options)}`, async () => {
            // Arrange
            const f = await fixture(options);
            try {
                // Act and Assert
                await expect(
                    verifyManualReleaseRun(
                        { sourceSha, familyVersion: '0.1.0' },
                        f.request,
                        f.environment,
                        true,
                    ),
                ).rejects.toThrow();
            } finally {
                await rm(f.root, { recursive: true, force: true });
            }
        });
    it('binds a cross-run retry to the exact owner-selected immutable artifact ID', async () => {
        // Arrange
        const f = await fixture({ selected: '100' });
        try {
            // Act
            const result = await verifyManualReleaseRun(
                { sourceSha, familyVersion: '0.1.0', artifactId: 100 },
                f.request,
                f.environment,
                true,
            );
            // Assert
            expect(result).toEqual({ runId: 200, attempt: 2, artifactId: 100 });
        } finally {
            await rm(f.root, { recursive: true, force: true });
        }
    });
});
