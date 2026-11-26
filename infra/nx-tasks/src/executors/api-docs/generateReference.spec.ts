// #region Imports

import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateReference } from './generateReference.js';

// #endregion

describe('generateReference', () => {
    let root: string;
    let library: string;
    let authored: string;
    let index: string;
    const packageName = '@pixel-brewery/remote-fixture';

    beforeEach(async () => {
        root = await realpath(await mkdtemp(join(tmpdir(), 'remote-api-spec-')));
        library = join(root, 'libs', 'remote-fixture');
        authored = join(root, '.docs', 'packages', 'remote-fixture', 'README.md');
        index = join(root, '.docs', 'api', 'api-index.json');
        await mkdir(join(library, 'src'), { recursive: true });
        await mkdir(join(root, '.docs', 'packages', 'remote-fixture'), { recursive: true });
        await writeFile(authored, 'Handwritten integration guide.\n');
        await writeFile(
            join(library, 'package.json'),
            JSON.stringify({
                name: packageName,
                version: '0.0.0',
                type: 'module',
                exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' } },
            }),
        );
        await writeFile(
            join(library, 'tsconfig.lib.json'),
            JSON.stringify({
                compilerOptions: {
                    target: 'ES2024',
                    module: 'NodeNext',
                    moduleResolution: 'NodeNext',
                    types: [],
                    strict: true,
                },
                include: ['src/**/*.ts'],
            }),
        );
        await writeFile(
            join(library, 'src', 'index.ts'),
            '/** Snapshot returned by a completed fixture operation. */\nexport interface ISnapshot {\n' +
                '    /** Whether the operation completed. */\n    readonly ready: boolean;\n}\n',
        );
    });

    afterEach(async () => {
        if (root) await rm(root, { recursive: true, force: true });
    });

    it('writes a portable public reference alongside authored package guides', async () => {
        await expect(generateReference(root, 'write')).resolves.toBe(1);

        const serialized = await readFile(index, 'utf8');
        expect(serialized).not.toContain(root);
        expect(JSON.parse(serialized)).toMatchObject({
            packages: [
                {
                    name: packageName,
                    entryPoints: [
                        {
                            exports: [
                                {
                                    name: 'ISnapshot',
                                    link: 'packages/remote-fixture/api/interfaces/ISnapshot.md',
                                },
                            ],
                        },
                    ],
                },
            ],
        });
        expect(await readFile(authored, 'utf8')).toBe('Handwritten integration guide.\n');
        await expect(generateReference(root, 'check')).resolves.toBe(1);
    });

    it('reports generated drift without modifying the checkout', async () => {
        await generateReference(root, 'write');
        await writeFile(index, 'stale\n');

        await expect(generateReference(root, 'check')).rejects.toThrow('api/api-index.json');
        expect(await readFile(index, 'utf8')).toBe('stale\n');
    });

    it('preserves the published reference when a public member loses its TSDoc', async () => {
        await generateReference(root, 'write');
        const previous = await readFile(index, 'utf8');
        await writeFile(
            join(library, 'src', 'index.ts'),
            '/** Fixture snapshot. */\nexport interface ISnapshot { readonly ready: boolean; }\n',
        );

        await expect(generateReference(root, 'write')).rejects.toThrow(
            'API documentation validation failed',
        );
        expect(await readFile(index, 'utf8')).toBe(previous);
    });
});
