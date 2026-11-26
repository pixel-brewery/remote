// #region Imports
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getPackedPackageDefinitions } from '../packed-packages/getPackedPackageDefinitions.js';
import type { IPackedCommandRunner } from '../packed-packages/interfaces/IPackedCommandRunner.js';
import type { IReleaseCandidate } from './interfaces/IReleaseCandidate.js';
import type { IReleaseRequest } from './interfaces/IReleaseRequest.js';
import { operateReleaseRegistry } from './operateReleaseRegistry.js';
// #endregion

async function fixture(
    options: {
        present?: number;
        private?: boolean;
        wrongHash?: boolean;
        wrongBytes?: boolean;
        foreign?: boolean;
        failUpload?: number;
    } = {},
) {
    const directory = await mkdtemp(join(tmpdir(), 'remote-registry-unit-'));
    const bytes = new Map<string, Buffer>();
    const archives = getPackedPackageDefinitions().map((definition) => {
        const content = Buffer.from('same retained tar bytes for ' + definition.name);
        bytes.set(definition.name, content);
        return {
            name: definition.name,
            version: '0.1.0',
            file: definition.name.split('/')[1] + '.tgz',
            bytes: content.length,
            sha256: createHash('sha256').update(content).digest('hex'),
            integrity: 'sha512-' + createHash('sha512').update(content).digest('base64'),
        };
    });
    for (const archive of archives)
        await writeFile(join(directory, archive.file), bytes.get(archive.name)!);
    const candidate: IReleaseCandidate = {
        format: 1,
        repositoryId: 1472760702,
        sourceSha: 'a'.repeat(40),
        familyVersion: '0.1.0',
        producerRunId: 200,
        producerAttempt: 1,
        verification: { packages: 9, exports: 18, runtimeImports: 5 },
        archives,
    };
    const present = new Set(archives.slice(0, options.present ?? 9).map((archive) => archive.name));
    const events: string[] = [];
    const published: string[] = [];
    let failed = false;
    const request: IReleaseRequest = async (method, endpoint) => {
        expect(method).toBe('GET');
        if (endpoint.includes('/versions?'))
            return [{ id: 10, name: '0.1.0', metadata: { package_type: 'npm' } }];
        const name = endpoint.split('/').at(-1)!;
        return {
            id: 9,
            name,
            package_type: 'npm',
            visibility: options.private ? 'private' : 'public',
            repository: { id: options.foreign ? 1 : 1472760702, full_name: 'pixel-brewery/remote' },
        };
    };
    const command: IPackedCommandRunner = async (tool, args, temporary, environment) => {
        expect(tool).toBe('npm');
        expect(environment['GH_TOKEN']).toBeUndefined();
        expect(environment['GITHUB_TOKEN']).toBeUndefined();
        expect(environment['NODE_OPTIONS']).toBeUndefined();
        expect(environment['NODE_AUTH_TOKEN']).toBe('unit-workflow-token');
        const config = await readFile(environment['NPM_CONFIG_USERCONFIG']!, 'utf8');
        expect(config).toContain('${NODE_AUTH_TOKEN}');
        expect(config).not.toContain('unit-workflow-token');
        if (args[0] === 'publish') {
            const archive = archives.find((value) => value.file === basename(String(args[1])))!;
            expect(args).toContain('--ignore-scripts');
            expect(args).toContain('--registry=https://npm.pkg.github.com');
            expect(await readFile(String(args[1]))).toEqual(bytes.get(archive.name));
            events.push('publish');
            published.push(archive.name);
            present.add(archive.name);
            if (!failed && options.failUpload === published.length) {
                failed = true;
                throw Object.assign(new Error('PRIVATE BODY MUST NOT LEAK'), {
                    stderr: 'PRIVATE BODY MUST NOT LEAK',
                });
            }
            return '{}';
        }
        const specifier = String(args[1]);
        const name = specifier.slice(0, specifier.lastIndexOf('@'));
        const archive = archives.find((value) => value.name === name)!;
        if (!present.has(name))
            throw Object.assign(new Error('Missing version'), {
                stdout: JSON.stringify({ error: { code: 'E404', summary: 'PRIVATE BODY' } }),
            });
        if (args[0] === 'view')
            return JSON.stringify({
                name,
                version: archive.version,
                dist: { integrity: options.wrongHash ? 'sha512-other' : archive.integrity },
            });
        expect(args[0]).toBe('pack');
        expect(args).toContain('--ignore-scripts');
        const filename = archive.file;
        const content = Buffer.from(bytes.get(name)!);
        if (options.wrongBytes) content[0] = content[0]! ^ 1;
        await writeFile(join(temporary, filename), content);
        return JSON.stringify([{ filename }]);
    };
    const execute = (publish: boolean) =>
        operateReleaseRegistry(
            directory,
            candidate,
            request,
            command,
            {
                ...process.env,
                GITHUB_TOKEN: 'unit-workflow-token',
                GH_TOKEN: 'must-not-forward',
                NODE_OPTIONS: '--untrusted',
            },
            publish,
            async () => {
                events.push('tag-proof');
            },
        );
    return { directory, archives, execute, events, published };
}

describe('operateReleaseRegistry', () => {
    it('uploads only missing checked tarballs after the source-tag proof and verifies all nine', async () => {
        // Arrange
        const f = await fixture({ present: 3 });
        try {
            // Act
            const result = await f.execute(true);
            // Assert
            expect(result).toHaveLength(9);
            expect(f.published).toHaveLength(6);
            expect(f.events[0]).toBe('tag-proof');
        } finally {
            await rm(f.directory, { recursive: true, force: true });
        }
    });
    it('retries a partial upload using identical content without republishing accepted versions', async () => {
        // Arrange
        const f = await fixture({ present: 3, failUpload: 2 });
        try {
            // Act and Assert
            await expect(f.execute(true)).rejects.toThrow(
                'Official npm publish failed; retained candidate is preserved.',
            );
            expect(f.published).toHaveLength(2);
            await expect(f.execute(true)).resolves.toHaveLength(9);
            expect(f.published).toHaveLength(6);
            expect(new Set(f.published).size).toBe(6);
            expect(await readFile(join(f.directory, f.archives[0]!.file))).toBeDefined();
        } finally {
            await rm(f.directory, { recursive: true, force: true });
        }
    });
    for (const options of [{ wrongHash: true }, { wrongBytes: true }, { foreign: true }])
        it(`rejects registry conflicts before tag or publication ${JSON.stringify(options)}`, async () => {
            // Arrange
            const f = await fixture(options);
            try {
                // Act and Assert
                await expect(f.execute(true)).rejects.toThrow();
                expect(f.events).toEqual([]);
                expect(f.published).toEqual([]);
            } finally {
                await rm(f.directory, { recursive: true, force: true });
            }
        });
    it('preserves verified uploads but refuses to claim a private package ACL is public', async () => {
        // Arrange
        const f = await fixture({ present: 0, private: true });
        try {
            // Act and Assert
            await expect(f.execute(true)).rejects.toThrow(
                'Public package visibility requires owner action',
            );
            expect(f.published).toHaveLength(9);
            expect(await readFile(join(f.directory, f.archives[0]!.file))).toBeDefined();
        } finally {
            await rm(f.directory, { recursive: true, force: true });
        }
    });
    it('read-only verification performs no tag callback or registry publication', async () => {
        // Arrange
        const f = await fixture();
        try {
            // Act
            const result = await f.execute(false);
            // Assert
            expect(result).toHaveLength(9);
            expect(f.events).toEqual([]);
            expect(f.published).toEqual([]);
        } finally {
            await rm(f.directory, { recursive: true, force: true });
        }
    });
});
