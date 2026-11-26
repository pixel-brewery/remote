// #region Imports
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { promisify } from 'node:util';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { getPackedPackageDefinitions } from './getPackedPackageDefinitions.js';
import type { IPackedCommandRunner } from './interfaces/IPackedCommandRunner.js';
import type { IPackedPackageManifest } from './interfaces/IPackedPackageManifest.js';
import { verifyPackedPackages } from './verifyPackedPackages.js';
// #endregion

async function fixture(
    options: {
        failInstall?: boolean;
        linkPackage?: boolean;
        missingWsTypes?: boolean;
        compilerVersion?: string;
    } = {},
) {
    const root = await mkdtemp(join(tmpdir(), 'remote-packed-unit-'));
    const license =
        'MIT License\nCopyright test fixture. Permission is hereby granted to verify isolated package consumption.\n'.repeat(
            3,
        );
    const peers = {
        '@types/node': '26.6.6',
        rxjs: '7.8.2',
        '@angular/core': '22.2.6',
        '@capacitor/core': '8.6.2',
        electron: '45.5.0',
        zod: '4.6.7',
        ws: '8.23.0',
    };
    const nativeVersion = (
        JSON.parse(
            await readFile(
                createRequire(import.meta.url).resolve('@typescript/native/package.json'),
                'utf8',
            ),
        ) as { readonly version: string }
    ).version;
    const apiPackageVersion = (
        JSON.parse(
            await readFile(
                createRequire(import.meta.url).resolve('typescript/package.json'),
                'utf8',
            ),
        ) as { readonly version: string }
    ).version;
    await writeFile(
        join(root, 'package.json'),
        JSON.stringify({
            devDependencies: {
                typescript: `npm:@typescript/typescript6@${apiPackageVersion}`,
                '@typescript/native': `npm:typescript@${nativeVersion}`,
                ...peers,
            },
        }),
    );
    await writeFile(join(root, 'LICENSE'), license);
    await mkdir(join(root, 'node_modules/typescript'), { recursive: true });
    await writeFile(
        join(root, 'node_modules/typescript/package.json'),
        JSON.stringify({ name: '@typescript/typescript6', version: apiPackageVersion }),
    );
    await mkdir(join(root, 'node_modules/@typescript/native/bin'), { recursive: true });
    await writeFile(join(root, 'node_modules/@typescript/native/bin/tsc'), '');
    await writeFile(
        join(root, 'node_modules/@typescript/native/package.json'),
        JSON.stringify({
            name: 'typescript',
            version: nativeVersion,
            exports: { './package.json': './package.json' },
        }),
    );
    const definitions = getPackedPackageDefinitions();
    const manifests = new Map<string, IPackedPackageManifest>();
    for (const definition of definitions) {
        const dependencies: Record<string, string> = Object.fromEntries(
            definition.sdkDependencies.map((name) => [name, '0.1.0']),
        );
        if (definition.name.endsWith('-protocol')) dependencies['zod'] = peers.zod;
        if (definition.name.endsWith('-node') || definition.name.endsWith('-electron'))
            dependencies['ws'] = peers.ws;
        const peerDependencies: Record<string, string> = {};
        if (definition.name.endsWith('-angular')) peerDependencies['@angular/core'] = '>=22 <23';
        if (definition.name.endsWith('-capacitor')) peerDependencies['@capacitor/core'] = '>=8 <9';
        if (definition.name.endsWith('-electron')) peerDependencies['electron'] = '>=45 <46';
        manifests.set(definition.name, {
            name: definition.name,
            version: '0.1.0',
            type: 'module',
            license: 'MIT',
            files: ['dist', 'LICENSE'],
            dependencies,
            peerDependencies,
            exports: {
                '.': { types: './dist/index.d.ts', import: './dist/index.js' },
                './package.json': './package.json',
            },
        });
        await mkdir(join(root, definition.directory), { recursive: true });
        await writeFile(
            join(root, definition.directory, 'package.json'),
            JSON.stringify(manifests.get(definition.name)),
        );
    }
    let consumer = '';
    const calls: {
        command: string;
        args: readonly string[];
        directory: string;
        environment: Readonly<NodeJS.ProcessEnv>;
    }[] = [];
    const command: IPackedCommandRunner = async (executable, args, directory, environment) => {
        calls.push({ command: executable, args, directory, environment });
        if (executable === 'yarn') {
            await writeFile(String(args.at(-1)), 'fixture archive bytes for ' + String(args[1]));
            return '';
        }
        if (executable === 'tar') {
            const archive = args[1] ?? '';
            const name = '@pixel-brewery/' + basename(archive).replace(/\.tgz$/u, '');
            if (args[0] === '-tzf')
                return [
                    'package/package.json',
                    'package/LICENSE',
                    'package/dist/index.js',
                    'package/dist/index.d.ts',
                ].join('\n');
            if (args[2] === 'package/LICENSE') return license;
            return JSON.stringify(manifests.get(name));
        }
        if (executable === 'npm') {
            consumer = directory;
            if (options.failInstall) throw new Error('Isolated install failed.');
            await mkdir(join(consumer, 'node_modules/@types/node'), { recursive: true });
            await writeFile(join(consumer, 'node_modules/@types/node/index.d.ts'), 'export {};');
            for (const definition of definitions) {
                const packageRoot = join(consumer, 'node_modules', definition.name);
                if (options.linkPackage && definition === definitions[0]) {
                    await mkdir(join(root, 'aliased-package'), { recursive: true });
                    await mkdir(dirname(packageRoot), { recursive: true });
                    await symlink(join(root, 'aliased-package'), packageRoot, 'dir');
                    continue;
                }
                await mkdir(join(packageRoot, 'dist'), { recursive: true });
                await writeFile(
                    join(packageRoot, 'package.json'),
                    JSON.stringify(manifests.get(definition.name)),
                );
                await writeFile(
                    join(packageRoot, 'dist/index.js'),
                    definition.runtime
                        ? 'export const value = 1;'
                        : "throw new Error('Privileged adapter was executed.');",
                );
                await writeFile(
                    join(packageRoot, 'dist/index.d.ts'),
                    options.missingWsTypes && definition.name.endsWith('-node')
                        ? "import type { WebSocket } from 'ws'; export type Socket = WebSocket;"
                        : 'export declare const value: number;',
                );
            }
            if (options.missingWsTypes) {
                await mkdir(join(consumer, 'node_modules/ws'), { recursive: true });
                await writeFile(
                    join(consumer, 'node_modules/ws/package.json'),
                    JSON.stringify({
                        name: 'ws',
                        version: '8.23.0',
                        type: 'module',
                        main: './index.js',
                    }),
                );
                await writeFile(
                    join(consumer, 'node_modules/ws/index.js'),
                    'export const WebSocket = class {};',
                );
            }
            return '';
        }
        const actual = [...args];
        if (actual[0]?.endsWith(join('@typescript', 'native', 'bin', 'tsc'))) {
            if (actual.includes('--version') && options.compilerVersion !== undefined)
                return options.compilerVersion;
            actual[0] = join(
                dirname(createRequire(import.meta.url).resolve('@typescript/native/package.json')),
                'bin',
                'tsc',
            );
        }
        return (
            await promisify(execFile)(executable, actual, {
                cwd: directory,
                env: environment,
                encoding: 'utf8',
            })
        ).stdout;
    };
    return { root, calls, command, consumer: (): string => consumer };
}

describe('verifyPackedPackages', () => {
    it('retains the same single checked tar family instead of packing publication copies', async () => {
        // Arrange
        const f = await fixture();
        const retained = join(f.root, 'retained');
        try {
            // Act
            const report = await verifyPackedPackages(f.root, f.command, {
                retainDirectory: retained,
            });
            // Assert
            expect(report.archives).toHaveLength(9);
            expect(f.calls.filter((call) => call.command === 'yarn')).toHaveLength(9);
            for (const archive of report.archives ?? []) {
                expect(await readFile(join(retained, archive.file), 'utf8')).toBe(
                    'fixture archive bytes for ' + archive.name,
                );
                expect(archive.sha256).toMatch(/^[0-9a-f]{64}$/u);
                expect(archive.integrity).toMatch(/^sha512-/u);
            }
        } finally {
            await rm(f.root, { recursive: true, force: true });
        }
    });

    it('preserves an existing retained directory instead of replacing another candidate', async () => {
        // Arrange
        const f = await fixture();
        const retained = join(f.root, 'retained');
        await mkdir(retained);
        await writeFile(join(retained, 'original'), 'preserve');
        try {
            // Act and Assert
            await expect(
                verifyPackedPackages(f.root, f.command, { retainDirectory: retained }),
            ).rejects.toMatchObject({ code: 'EEXIST' });
            expect(await readFile(join(retained, 'original'), 'utf8')).toBe('preserve');
        } finally {
            await rm(f.root, { recursive: true, force: true });
        }
    });

    it(
        'uses real isolated TypeScript and Node resolution while keeping privileged adapters type-only',
        { timeout: 15000 },
        async () => {
            // Arrange
            const f = await fixture();
            try {
                // Act
                const result = await verifyPackedPackages(f.root, f.command);
                // Assert
                expect(result).toEqual({ packages: 9, exports: 18, runtimeImports: 5 });
                const install = f.calls.find((call) => call.command === 'npm')!;
                expect(install.args).toContain('--ignore-scripts');
                expect(install.args).toContain('--no-audit');
                expect(install.environment['NODE_AUTH_TOKEN']).toBeUndefined();
                expect(install.environment['GH_TOKEN']).toBeUndefined();
                expect(install.environment['NODE_OPTIONS']).toBeUndefined();
                const nativeCompiler = f.calls.find((call) => call.args.includes('--project'))!;
                expect(nativeCompiler.args[0]).toBe(
                    await realpath(join(f.root, 'node_modules/@typescript/native/bin/tsc')),
                );
                expect(f.calls.some((call) => call.args.includes('--version'))).toBe(true);
                expect(f.calls.filter((call) => call.command === process.execPath)).toHaveLength(3);
                await expect(readFile(join(f.consumer(), 'package.json'))).rejects.toMatchObject({
                    code: 'ENOENT',
                });
            } finally {
                await rm(f.root, { recursive: true, force: true });
            }
        },
    );

    it(
        'does not conceal missing published ws types with an undeclared consumer peer',
        { timeout: 15000 },
        async () => {
            // Arrange
            const f = await fixture({ missingWsTypes: true });
            try {
                // Act and Assert
                await expect(verifyPackedPackages(f.root, f.command)).rejects.toMatchObject({
                    stdout: expect.stringContaining("declaration file for module 'ws'"),
                });
                expect(f.calls.filter((call) => call.command === process.execPath)).toHaveLength(2);
            } finally {
                await rm(f.root, { recursive: true, force: true });
            }
        },
    );

    it('rejects a mismatched compiler instead of accepting API compatibility as native proof', async () => {
        // Arrange
        const f = await fixture({ compilerVersion: `Version ${ts.version}\n` });
        try {
            // Act and Assert
            await expect(verifyPackedPackages(f.root, f.command)).rejects.toThrow(
                'must use the pinned native TypeScript CLI',
            );
            expect(f.calls.some((call) => call.args.includes('--project'))).toBe(false);
            await expect(readFile(join(f.consumer(), 'package.json'))).rejects.toMatchObject({
                code: 'ENOENT',
            });
        } finally {
            await rm(f.root, { recursive: true, force: true });
        }
    });

    it('fails without the native compiler instead of falling back to the API package', async () => {
        // Arrange
        const f = await fixture();
        await rm(join(f.root, 'node_modules/@typescript/native'), { recursive: true });
        await mkdir(join(f.root, 'node_modules/typescript/bin'), { recursive: true });
        await writeFile(join(f.root, 'node_modules/typescript/bin/tsc'), '');
        try {
            // Act and Assert
            await expect(verifyPackedPackages(f.root, f.command)).rejects.toMatchObject({
                code: 'MODULE_NOT_FOUND',
            });
            expect(f.calls).toHaveLength(0);
        } finally {
            await rm(f.root, { recursive: true, force: true });
        }
    });

    it('rejects a consumer package aliased back outside the isolated artifact tree', async () => {
        // Arrange
        const f = await fixture({ linkPackage: true });
        try {
            // Act and Assert
            await expect(verifyPackedPackages(f.root, f.command)).rejects.toThrow(
                'never workspace links',
            );
            expect(f.calls.some((call) => call.command === process.execPath)).toBe(false);
        } finally {
            await rm(f.root, { recursive: true, force: true });
        }
    });

    it('cleans its temporary consumer and never type checks after an install failure', async () => {
        // Arrange
        const f = await fixture({ failInstall: true });
        try {
            // Act and Assert
            await expect(verifyPackedPackages(f.root, f.command)).rejects.toThrow(
                'Isolated install failed.',
            );
            expect(f.calls.some((call) => call.command === process.execPath)).toBe(false);
            await expect(readFile(join(f.consumer(), 'package.json'))).rejects.toMatchObject({
                code: 'ENOENT',
            });
        } finally {
            await rm(f.root, { recursive: true, force: true });
        }
    });
});
