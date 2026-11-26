// #region Imports
import { describe, expect, it } from 'vitest';
import { getPackedPackageDefinitions } from './getPackedPackageDefinitions.js';
import type { IPackedPackageManifest } from './interfaces/IPackedPackageManifest.js';
import { verifyPackedManifest } from './verifyPackedManifest.js';
// #endregion

const definition = getPackedPackageDefinitions()[0]!;
const files = [
    'package/package.json',
    'package/LICENSE',
    'package/dist/index.js',
    'package/dist/index.d.ts',
];
const manifest: IPackedPackageManifest = {
    name: definition.name,
    version: '0.1.0',
    type: 'module',
    license: 'MIT',
    files: ['dist', 'LICENSE'],
    exports: {
        '.': { types: './dist/index.d.ts', import: './dist/index.js' },
        './package.json': './package.json',
    },
    dependencies: { zod: '4.6.7' },
};

describe('verifyPackedManifest', () => {
    it('covers executable, declaration and JSON exports of an actual explicit inventory', () => {
        // Arrange
        const input = structuredClone(manifest);
        // Act
        const entries = verifyPackedManifest(definition, input, files, { zod: '4.6.7' });
        // Assert
        expect(entries).toEqual([
            { specifier: definition.name, json: false, runtime: true },
            { specifier: definition.name + '/package.json', json: true, runtime: false },
        ]);
        expect(input).toEqual(manifest);
    });

    it('accepts npm root-anchored file globs when actual exports and license are packed', () => {
        // Arrange
        const changed = { ...manifest, files: ['/dist/**', '/LICENSE', '!**/.build/**'] };
        // Act
        const entries = verifyPackedManifest(definition, changed, files, { zod: '4.6.7' });
        // Assert
        expect(entries).toHaveLength(2);
    });

    it.each([
        ['license', files.filter((file) => !file.endsWith('/LICENSE'))],
        ['declarations', files.filter((file) => !file.endsWith('.d.ts'))],
        ['runtime output', files.filter((file) => !file.endsWith('.js'))],
    ])(
        'still rejects missing packed %s with rooted globs and identifies the package',
        (_name, inventory) => {
            // Arrange
            const changed = { ...manifest, files: ['/dist/**', '/LICENSE'] };
            // Act and Assert
            expect(() =>
                verifyPackedManifest(definition, changed, inventory, { zod: '4.6.7' }),
            ).toThrow(definition.name);
        },
    );

    it('rejects an actual Capacitor native checkout even when manifest globs claim to exclude it', () => {
        // Arrange
        const capacitor = getPackedPackageDefinitions().find((entry) =>
            entry.name.endsWith('-capacitor'),
        )!;
        const changed = {
            ...manifest,
            name: capacitor.name,
            files: ['/dist/**', '/LICENSE', '/ios/**', '!**/.build/**'],
            dependencies: Object.fromEntries(
                capacitor.sdkDependencies.map((name) => [name, '0.1.0']),
            ),
        };
        const contaminated = [...files, 'package/ios/.build/checkouts/dependency/source.swift'];
        // Act and Assert
        expect(() => verifyPackedManifest(capacitor, changed, contaminated, {})).toThrow(
            `${capacitor.name}: Unexpected published local state`,
        );
    });

    it.each([
        ['missing LICENSE', files.filter((file) => !file.endsWith('/LICENSE'))],
        ['missing declaration target', files.filter((file) => !file.endsWith('.d.ts'))],
        ['unbuilt source publication', [...files, 'package/src/index.ts']],
        ['workspace local state', [...files, 'package/dist/tsconfig.tsbuildinfo']],
        ['archive traversal', [...files, 'package/../outside.js']],
    ])('rejects %s before consumer installation', (_name, inventory) => {
        // Arrange and Act
        const act = (): unknown =>
            verifyPackedManifest(definition, manifest, inventory, { zod: '4.6.7' });
        // Assert
        expect(act).toThrow();
    });

    it.each([
        ['workspace dependency', { zod: 'workspace:*' }],
        ['public dependency range', { zod: '^4.6.7' }],
        ['unapproved public version', { zod: '4.6.8' }],
        ['outward SDK dependency', { zod: '4.6.7', '@pixel-brewery/remote-node': '0.1.0' }],
    ])('rejects %s in the published manifest', (_name, dependencies) => {
        // Arrange
        const changed = { ...manifest, dependencies };
        // Act and Assert
        expect(() => verifyPackedManifest(definition, changed, files, { zod: '4.6.7' })).toThrow();
    });

    it('requires the actual default and declaration files for every subpath', () => {
        // Arrange
        const changed = {
            ...manifest,
            exports: {
                ...manifest.exports,
                './missing': { types: './dist/missing.d.ts', import: './dist/missing.js' },
            },
        };
        // Act and Assert
        expect(() => verifyPackedManifest(definition, changed, files, { zod: '4.6.7' })).toThrow(
            'Missing packed export target',
        );
    });

    it('rejects an artifact exposing metadata without any usable SDK API', () => {
        // Arrange
        const changed = { ...manifest, exports: { './package.json': './package.json' } };
        // Act and Assert
        expect(() => verifyPackedManifest(definition, changed, files, { zod: '4.6.7' })).toThrow(
            'Publish API entries',
        );
    });
});
