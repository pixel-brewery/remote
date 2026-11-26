// #region Imports
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import {
    lstat,
    copyFile,
    mkdir,
    mkdtemp,
    readFile,
    readdir,
    realpath,
    rm,
    writeFile,
} from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { getPackedPackageDefinitions } from './getPackedPackageDefinitions.js';
import type { IPackedCommandRunner } from './interfaces/IPackedCommandRunner.js';
import type { IPackedArchive } from './interfaces/IPackedArchive.js';
import type { IPackedExport } from './interfaces/IPackedExport.js';
import type { IPackedPackageManifest } from './interfaces/IPackedPackageManifest.js';
import type { IPackedPackagesReport } from './interfaces/IPackedPackagesReport.js';
import type { IPackedPackagesOptions } from './interfaces/IPackedPackagesOptions.js';
import { runPackedCommand } from './runPackedCommand.js';
import { verifyPackedImports } from './verifyPackedImports.js';
import { verifyPackedManifest } from './verifyPackedManifest.js';
// #endregion

/**
 * Packs every SDK library and verifies real resolution outside the workspace.
 * @remarks Prerequisite builds belong to the Nx task graph. This task never builds,
 * publishes or reads credentials. It owns and removes only its new temporary tree.
 * Browser and privileged Electron adapters receive strict declaration checks;
 * ordinary Node imports cover the portable, Node and testing public entries.
 * The pinned native TypeScript CLI checks declarations; the separate published
 * API compatibility package supplies AST inspection without selecting its compiler.
 * @param root - Workspace root supplied by Nx.
 * @param command - Replaceable external-tool boundary; production uses real tools.
 * @param options - Optional retention of these same verified archives, without repacking.
 * @returns Counts after archive, isolated-install, import and type checks complete.
 * @throws An error when any artifact, dependency, resolver or compiler check fails.
 * @public
 */
export async function verifyPackedPackages(
    root: string,
    command: IPackedCommandRunner = runPackedCommand,
    options: IPackedPackagesOptions = {},
): Promise<IPackedPackagesReport> {
    root = resolve(root);
    const rootManifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
        devDependencies: Record<string, string>;
    };
    const resolver = createRequire(join(root, 'package.json'));
    const apiPackage = JSON.parse(
        await readFile(resolver.resolve('typescript/package.json'), 'utf8'),
    ) as { readonly name: string; readonly version: string };
    assert.equal(
        apiPackage.name,
        '@typescript/typescript6',
        'Use the published API compatibility package.',
    );
    assert.match(ts.version, /^6\./u, 'AST inspection requires the supported TypeScript 6 API.');
    assert.equal(
        rootManifest.devDependencies['typescript'],
        `npm:@typescript/typescript6@${apiPackage.version}`,
        'Use the exact root TypeScript API compatibility package.',
    );
    const nativeVersion = rootManifest.devDependencies['@typescript/native']?.match(
        /^npm:typescript@(\d+\.\d+\.\d+)$/u,
    )?.[1];
    assert(nativeVersion, 'Pin the native TypeScript CLI to an exact published version.');
    const compiler = join(
        dirname(resolver.resolve('@typescript/native/package.json')),
        'bin',
        'tsc',
    );
    const definitions = getPackedPackageDefinitions();
    const temporary = await mkdtemp(join(tmpdir(), 'remote-packed-packages-'));
    let retained: string | undefined;
    let complete = false;
    const environment: NodeJS.ProcessEnv = {};
    for (const key of [
        'PATH',
        'HOME',
        'LANG',
        'LC_ALL',
        'TMPDIR',
        'TEMP',
        'TMP',
        'SystemRoot',
        'SYSTEMROOT',
        'WINDIR',
        'COMSPEC',
        'PATHEXT',
        'USERPROFILE',
        'COREPACK_HOME',
    ]) {
        if (process.env[key] !== undefined) environment[key] = process.env[key];
    }
    try {
        const archives = join(temporary, 'archives');
        const consumer = join(temporary, 'consumer');
        await mkdir(archives);
        await mkdir(consumer);
        const rootLicense = (await readFile(join(root, 'LICENSE'), 'utf8')).trim();
        assert(rootLicense.length > 100, 'Workspace LICENSE is missing its license terms.');
        const dependencies: Record<string, string> = {};
        const manifests = new Map<string, IPackedPackageManifest>();
        const entries: IPackedExport[] = [];
        const peers = new Set(['@types/node', 'rxjs']);
        const versions = new Set<string>();
        for (const definition of definitions) {
            const sourceManifest = JSON.parse(
                await readFile(join(root, definition.directory, 'package.json'), 'utf8'),
            ) as IPackedPackageManifest;
            assert.equal(
                sourceManifest.name,
                definition.name,
                'Pack only the designated library owner.',
            );
            const archive = join(archives, definition.name.split('/')[1] + '.tgz');
            await command(
                'yarn',
                ['workspace', definition.name, 'pack', '--out', archive],
                root,
                environment,
            );
            const files = (await command('tar', ['-tzf', archive], temporary, environment))
                .trim()
                .split('\n')
                .filter(Boolean);
            const manifest = JSON.parse(
                await command(
                    'tar',
                    ['-xOf', archive, 'package/package.json'],
                    temporary,
                    environment,
                ),
            ) as IPackedPackageManifest;
            assert.equal(
                manifest.version,
                sourceManifest.version,
                'The packed artifact must retain its authored release version.',
            );
            entries.push(
                ...verifyPackedManifest(definition, manifest, files, rootManifest.devDependencies),
            );
            const license = await command(
                'tar',
                ['-xOf', archive, 'package/LICENSE'],
                temporary,
                environment,
            );
            assert.equal(
                license.trim(),
                rootLicense,
                `${definition.name} must ship the workspace license terms.`,
            );
            versions.add(manifest.version);
            manifests.set(definition.name, manifest);
            dependencies[definition.name] = 'file:' + archive;
            for (const name of Object.keys(manifest.peerDependencies ?? {})) peers.add(name);
        }
        assert.equal(versions.size, 1, 'All SDK artifacts must publish the same version.');
        for (const name of peers) {
            const version = rootManifest.devDependencies[name];
            assert(
                version && /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u.test(version),
                `Consumer peer ${name} requires an exact public root pin.`,
            );
            dependencies[name] = version;
        }
        await writeFile(
            join(consumer, 'package.json'),
            JSON.stringify(
                {
                    name: 'remote-isolated-artifact-consumer',
                    private: true,
                    type: 'module',
                    dependencies,
                },
                null,
                2,
            ),
        );
        const userConfig = join(temporary, 'npm-user-config');
        const globalConfig = join(temporary, 'npm-global-config');
        await writeFile(userConfig, '');
        await writeFile(globalConfig, '');
        const consumerEnvironment: NodeJS.ProcessEnv = {
            ...environment,
            NPM_CONFIG_USERCONFIG: userConfig,
            NPM_CONFIG_GLOBALCONFIG: globalConfig,
            NPM_CONFIG_CACHE: join(temporary, 'npm-cache'),
            NPM_CONFIG_REGISTRY: 'https://registry.npmjs.org/',
        };
        await command(
            'npm',
            [
                'install',
                '--ignore-scripts',
                '--no-audit',
                '--no-fund',
                '--registry=https://registry.npmjs.org/',
            ],
            consumer,
            consumerEnvironment,
        );
        const modules = await realpath(join(consumer, 'node_modules'));
        let checkedFiles = 0;
        for (const definition of definitions) {
            const directory = join(modules, definition.name);
            assert.equal(
                await realpath(directory),
                directory,
                'SDK artifacts must be extracted packages, never workspace links.',
            );
            const manifest = manifests.get(definition.name);
            assert(manifest);
            const installed = JSON.parse(
                await readFile(join(directory, 'package.json'), 'utf8'),
            ) as IPackedPackageManifest;
            assert.equal(installed.name, manifest.name);
            assert.equal(installed.version, manifest.version);
            assert.deepEqual(installed.exports, manifest.exports);
            const visit = async (path: string): Promise<void> => {
                for (const entry of await readdir(path, { withFileTypes: true })) {
                    const file = join(path, entry.name);
                    assert(
                        !(await lstat(file)).isSymbolicLink(),
                        'Published SDK files must not alias files outside the artifact.',
                    );
                    if (entry.isDirectory()) await visit(file);
                    else if (/\.(?:js|d\.ts)$/u.test(entry.name)) {
                        assert(
                            ++checkedFiles < 10000,
                            'Packed source inspection exceeds its bound.',
                        );
                        verifyPackedImports(
                            definition,
                            manifest,
                            relative(directory, file).split(sep).join('/'),
                            await readFile(file, 'utf8'),
                        );
                    }
                }
            };
            await visit(join(directory, 'dist'));
        }
        const declarations = entries
            .map((entry, index) =>
                entry.json
                    ? `import Metadata${index} from ${JSON.stringify(entry.specifier)} with { type: 'json' };\nexport type Entry${index} = typeof Metadata${index};`
                    : `export type Entry${index} = typeof import(${JSON.stringify(entry.specifier)});`,
            )
            .join('\n');
        await writeFile(join(consumer, 'consumer.ts'), declarations + '\n');
        await writeFile(
            join(consumer, 'tsconfig.json'),
            JSON.stringify(
                {
                    compilerOptions: {
                        target: 'ES2024',
                        module: 'NodeNext',
                        moduleResolution: 'NodeNext',
                        strict: true,
                        noUncheckedIndexedAccess: true,
                        exactOptionalPropertyTypes: true,
                        noEmit: true,
                        skipLibCheck: false,
                        resolveJsonModule: true,
                        types: ['node'],
                        lib: ['ES2024', 'DOM', 'DOM.Iterable'],
                    },
                    files: ['consumer.ts'],
                },
                null,
                2,
            ),
        );
        assert.equal(
            (
                await command(
                    process.execPath,
                    [compiler, '--version'],
                    consumer,
                    consumerEnvironment,
                )
            ).trim(),
            `Version ${nativeVersion}`,
            'The isolated consumer must use the pinned native TypeScript CLI.',
        );
        await command(
            process.execPath,
            [compiler, '--project', join(consumer, 'tsconfig.json')],
            consumer,
            consumerEnvironment,
        );
        const probe = `import assert from 'node:assert/strict';\nimport { realpath } from 'node:fs/promises';\nimport { fileURLToPath } from 'node:url';\nconst root = ${JSON.stringify(modules + sep)};\nfor (const entry of ${JSON.stringify(entries)}) {\n const resolved = await realpath(fileURLToPath(import.meta.resolve(entry.specifier)));\n assert(resolved.startsWith(root), 'Export escaped isolated node_modules: ' + entry.specifier);\n if (entry.runtime) await import(entry.specifier);\n}\n`;
        await writeFile(join(consumer, 'runtime.mjs'), probe);
        await command(
            process.execPath,
            [join(consumer, 'runtime.mjs')],
            consumer,
            consumerEnvironment,
        );
        let retainedArchives: IPackedArchive[] | undefined;
        if (options.retainDirectory !== undefined) {
            const destination = resolve(root, options.retainDirectory);
            await mkdir(destination, { mode: 0o700 });
            retained = destination;
            retainedArchives = [];
            for (const definition of definitions) {
                const file = definition.name.split('/')[1] + '.tgz';
                const archive = join(archives, file);
                const info = await lstat(archive);
                assert(
                    info.isFile() && !info.isSymbolicLink(),
                    'Retain only regular packed archives.',
                );
                await copyFile(archive, join(destination, file), constants.COPYFILE_EXCL);
                const bytes = await readFile(join(destination, file));
                assert(
                    bytes.length > 0 && bytes.length < 256 * 1024 * 1024,
                    'Retained package exceeds the registry bound.',
                );
                retainedArchives.push({
                    name: definition.name,
                    version: manifests.get(definition.name)!.version,
                    file,
                    bytes: bytes.length,
                    sha256: createHash('sha256').update(bytes).digest('hex'),
                    integrity: 'sha512-' + createHash('sha512').update(bytes).digest('base64'),
                });
            }
        }
        complete = true;
        return {
            packages: definitions.length,
            exports: entries.length,
            runtimeImports: entries.filter((entry) => entry.runtime).length,
            ...(retainedArchives ? { archives: retainedArchives } : {}),
        };
    } finally {
        await rm(temporary, { recursive: true, force: true });
        if (retained && !complete) await rm(retained, { recursive: true, force: true });
    }
}
