// #region Imports
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getPackedPackageDefinitions } from '../packed-packages/getPackedPackageDefinitions.js';
import type { IPackedCommandRunner } from '../packed-packages/interfaces/IPackedCommandRunner.js';
import type { IReleaseCandidate } from './interfaces/IReleaseCandidate.js';
import type { IReleaseRequest } from './interfaces/IReleaseRequest.js';
import { loadReleaseCandidate } from './loadReleaseCandidate.js';
// #endregion

const sourceSha = 'a'.repeat(40);

async function fixture(
    options: {
        localPreview?: boolean;
        wrongProducer?: boolean;
        failed?: boolean;
        extra?: boolean;
        altered?: boolean;
        outsideAttempt?: boolean;
    } = {},
) {
    const root = await mkdtemp(join(tmpdir(), 'remote-release-candidate-'));
    const directory = join(root, 'candidate');
    await mkdir(directory);
    await writeFile(join(root, 'package.json'), JSON.stringify({ devDependencies: {} }));
    const definitions = getPackedPackageDefinitions();
    const manifests = new Map(
        definitions.map((definition) => [
            definition.name,
            {
                name: definition.name,
                version: '0.1.0',
                type: 'module',
                license: 'MIT',
                files: ['dist', 'LICENSE'],
                dependencies: Object.fromEntries(
                    definition.sdkDependencies.map((name) => [name, '0.1.0']),
                ),
                exports: {
                    '.': { types: './dist/index.d.ts', import: './dist/index.js' },
                    './package.json': './package.json',
                },
                publishConfig: { registry: 'https://npm.pkg.github.com', access: 'public' },
                repository: { url: 'https://github.com/pixel-brewery/remote.git' },
            },
        ]),
    );
    const archives = [];
    for (const definition of definitions) {
        const bytes = Buffer.from('immutable compressed unit bytes:' + definition.name);
        const file = definition.name.split('/')[1] + '.tgz';
        await writeFile(join(directory, file), bytes);
        archives.push({
            name: definition.name,
            version: '0.1.0',
            file,
            bytes: bytes.length,
            sha256: createHash('sha256').update(bytes).digest('hex'),
            integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64'),
        });
    }
    const candidate: IReleaseCandidate = {
        format: 1,
        repositoryId: 1472760702,
        sourceSha,
        familyVersion: '0.1.0',
        producerRunId: options.localPreview ? 0 : options.wrongProducer ? 999 : 200,
        producerAttempt: options.localPreview ? 0 : 1,
        verification: { packages: 9, exports: 18, runtimeImports: 5 },
        archives,
    };
    await writeFile(join(directory, 'release-candidate.json'), JSON.stringify(candidate));
    if (options.extra)
        await writeFile(
            join(directory, 'untrusted-script.js'),
            'throw new Error("must not execute");',
        );
    if (options.altered) {
        const file = join(directory, archives[0]!.file);
        const bytes = await readFile(file);
        bytes[0] = bytes[0]! ^ 1;
        await writeFile(file, bytes);
    }
    const request: IReleaseRequest = async (method, endpoint) => {
        expect(method).toBe('GET');
        if (endpoint.includes('/actions/artifacts/'))
            return {
                id: 100,
                name: `remote-sdk-0.1.0-${sourceSha}`,
                created_at: options.outsideAttempt
                    ? '2026-11-26T08:00:00Z'
                    : '2026-11-26T09:01:00Z',
                expired: false,
                size_in_bytes: 1000,
                digest: 'sha256:' + 'b'.repeat(64),
                workflow_run: {
                    id: 200,
                    repository_id: 1472760702,
                    head_repository_id: 1472760702,
                    head_branch: 'main',
                    head_sha: sourceSha,
                },
            };
        if (endpoint.endsWith('/actions/workflows/release-packages.yml'))
            return {
                id: 8,
                path: '.github/workflows/release-packages.yml',
                name: 'Release packages',
                state: 'active',
            };
        if (endpoint.includes('/jobs?'))
            return {
                total_count: 1,
                jobs: [
                    {
                        id: 50,
                        name: 'prepare',
                        run_id: 200,
                        run_attempt: 1,
                        head_sha: sourceSha,
                        started_at: '2026-11-26T09:00:00Z',
                        completed_at: '2026-11-26T09:02:00Z',
                        status: 'completed',
                        conclusion: options.failed ? 'failure' : 'success',
                    },
                ],
            };
        return {
            id: 200,
            workflow_id: 8,
            event: 'workflow_dispatch',
            head_sha: sourceSha,
            head_branch: 'main',
            repository: { id: 1472760702 },
            head_repository: { id: 1472760702 },
            actor: { id: 7, type: 'User' },
            path: '.github/workflows/release-packages.yml',
        };
    };
    const calls: string[] = [];
    const command: IPackedCommandRunner = async (tool, args) => {
        expect(tool).toBe('tar');
        calls.push(tool);
        const name = '@pixel-brewery/' + basename(String(args[1])).replace(/[.]tgz$/u, '');
        if (args[0] === '-xOf') return JSON.stringify(manifests.get(name));
        return [
            'package/package.json',
            'package/LICENSE',
            'package/dist/index.d.ts',
            'package/dist/index.js',
        ].join('\n');
    };
    return { root, directory, request, command, calls };
}

describe('loadReleaseCandidate', () => {
    it('accepts only the same immutable nine-tar family from a successful exact preparation attempt', async () => {
        // Arrange
        const f = await fixture();
        try {
            // Act
            const candidate = await loadReleaseCandidate(
                f.root,
                f.directory,
                { sourceSha, familyVersion: '0.1.0', artifactId: 100 },
                f.request,
                f.command,
            );
            // Assert
            expect(candidate.archives).toHaveLength(9);
            expect(f.calls).toHaveLength(18);
        } finally {
            await rm(f.root, { recursive: true, force: true });
        }
    });
    for (const options of [
        { localPreview: true },
        { wrongProducer: true },
        { failed: true },
        { extra: true },
        { altered: true },
        { outsideAttempt: true },
    ])
        it(`rejects an unpublishable or altered retained candidate ${JSON.stringify(options)}`, async () => {
            // Arrange
            const f = await fixture(options);
            try {
                // Act and Assert
                await expect(
                    loadReleaseCandidate(
                        f.root,
                        f.directory,
                        { sourceSha, familyVersion: '0.1.0', artifactId: 100 },
                        f.request,
                        f.command,
                    ),
                ).rejects.toThrow();
                expect(f.calls).toEqual([]);
            } finally {
                await rm(f.root, { recursive: true, force: true });
            }
        });
});
