// #region Imports

import {
    cp,
    lstat,
    mkdir,
    mkdtemp,
    readFile,
    readdir,
    realpath,
    rm,
    writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, posix } from 'node:path';
import { convertEntry } from './convertEntry.js';
import type { IPackageManifest } from './interfaces/IPackageManifest.js';

// #endregion

/**
 * Generates a portable SDK reference or compares it to the committed files.
 *
 * @param root - Nx workspace root.
 * @param mode - Whether to replace owned API directories or verify them without writing.
 * @returns Number of documented SDK entry points.
 * @throws When a manifest export, TypeDoc result or generated file is invalid.
 *
 * @public
 */
export async function generateReference(root: string, mode: 'write' | 'check'): Promise<number> {
    const repository = await realpath(root);
    const docs = join(repository, '.docs');
    const staging = await realpath(await mkdtemp(join(tmpdir(), 'remote-api-')));
    const libraries = join(repository, 'libs');
    const packages = [];
    const failures: string[] = [];

    try {
        for (const directory of (await readdir(libraries, { withFileTypes: true })).sort((a, b) =>
            a.name.localeCompare(b.name),
        )) {
            if (!directory.isDirectory() || !directory.name.startsWith('remote-')) continue;
            const library = join(libraries, directory.name);
            const manifest: IPackageManifest = JSON.parse(
                await readFile(join(library, 'package.json'), 'utf8'),
            );
            if (!manifest.exports?.['.'])
                throw new Error(`${manifest.name} must declare a root export.`);

            const entryPoints = [];
            for (const [subpath, targets] of Object.entries(manifest.exports).sort(([a], [b]) =>
                a.localeCompare(b),
            )) {
                if (subpath === './package.json') continue;
                if (typeof targets === 'string')
                    throw new Error(
                        `Expected conditional SDK exports in ${manifest.name}: ${subpath}.`,
                    );
                // Generated components share the accessor API documented at the package root.
                if (
                    subpath === './components/*' &&
                    targets.types === './dist/components/*/index.d.ts' &&
                    (targets.import ?? targets.default) === './dist/components/*/index.js'
                )
                    continue;
                if (subpath !== '.' && !/^\.\/[\w-]+(?:\/[\w-]+)*$/.test(subpath)) {
                    throw new Error(
                        `Expected a literal SDK subpath in ${manifest.name}: ${subpath}`,
                    );
                }
                const sourcePath = targets.types?.match(/^\.\/dist\/([\w/-]+)\.d\.ts$/)?.[1];
                if (
                    !sourcePath ||
                    (targets.import ?? targets.default) !== `./dist/${sourcePath}.js`
                ) {
                    throw new Error(
                        `Expected matching ESM and declaration exports in ${manifest.name}: ${subpath}`,
                    );
                }

                const suffix = subpath === '.' ? '' : `subpaths/${subpath.slice(2)}`;
                const importPath = manifest.name + (subpath === '.' ? '' : subpath.slice(1));
                const markdown = posix.join('packages', directory.name, 'api', suffix);
                const reflection = posix.join('api', directory.name, suffix, 'reflection.json');
                let exports: Awaited<ReturnType<typeof convertEntry>>;
                try {
                    exports = await convertEntry({
                        root: repository,
                        staging,
                        importPath,
                        source: join(library, 'src', `${sourcePath}.ts`),
                        config: join(library, 'tsconfig.lib.json'),
                        markdown,
                        reflection,
                    });
                } catch (error) {
                    failures.push(
                        `${importPath}: ${error instanceof Error ? error.message : String(error)}`,
                    );
                    continue;
                }
                entryPoints.push({
                    importPath,
                    markdown: `${markdown}/index.md`,
                    reflection,
                    exports,
                });
            }
            packages.push({ name: manifest.name, version: manifest.version, entryPoints });
        }

        if (failures.length)
            throw new Error(`API reference validation failed:\n${failures.join('\n')}`);
        if (!packages.length) throw new Error('No Remote SDK packages found under libs/.');
        const index = { schemaVersion: 1, linkBase: '.docs/', packages };
        await writeFile(
            join(staging, 'api', 'api-index.json'),
            `${JSON.stringify(index, null, 2)}\n`,
        );
        const expected = await readGeneratedFiles(staging);
        for (const pkg of packages) {
            for (const entry of pkg.entryPoints) {
                for (const link of [
                    entry.markdown,
                    entry.reflection,
                    ...entry.exports.map((symbol) => symbol.link),
                ]) {
                    if (!expected.has(link.split('#')[0]!))
                        throw new Error(`Generated API reference is missing ${link}.`);
                }
            }
        }
        for (const [file, contents] of expected) {
            if (contents.includes(repository) || contents.includes(staging)) {
                throw new Error(
                    `Generated API reference contains a machine-specific path: ${file}`,
                );
            }
        }
        const actual = await readGeneratedFiles(docs);
        if (mode === 'check') {
            const paths = new Set([...expected.keys(), ...actual.keys()]);
            const differences = [...paths]
                .filter((file) => expected.get(file) !== actual.get(file))
                .sort();
            if (differences.length)
                throw new Error(`Run yarn docs to update:\n${differences.join('\n')}`);
        } else {
            for (const directory of await generatedDirectories(docs)) {
                await rm(join(docs, directory), { recursive: true });
            }
            for (const directory of await generatedDirectories(staging)) {
                const destination = join(docs, directory);
                await mkdir(dirname(destination), { recursive: true });
                await cp(join(staging, directory), destination, { recursive: true });
            }
        }

        return packages.reduce((count, pkg) => count + pkg.entryPoints.length, 0);
    } finally {
        await rm(staging, { recursive: true, force: true });
    }
}

async function generatedDirectories(docs: string): Promise<string[]> {
    if (!(await directoryExists(docs))) return [];
    const owned = (await directoryExists(join(docs, 'api'))) ? ['api'] : [];
    if (!(await directoryExists(join(docs, 'packages')))) return owned;

    for (const pkg of await readdir(join(docs, 'packages'))) {
        if (!pkg.startsWith('remote-') || !(await directoryExists(join(docs, 'packages', pkg))))
            continue;
        const relative = posix.join('packages', pkg, 'api');
        if (await directoryExists(join(docs, relative))) owned.push(relative);
    }
    return owned;
}

async function directoryExists(path: string): Promise<boolean> {
    try {
        const stat = await lstat(path);
        if (!stat.isDirectory())
            throw new Error(`Expected an owned documentation directory at ${path}.`);
        return true;
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return false;
        throw error;
    }
}

async function readGeneratedFiles(root: string): Promise<Map<string, string>> {
    const files = new Map<string, string>();
    async function visit(directory: string): Promise<void> {
        for (const entry of await readdir(join(root, directory), { withFileTypes: true })) {
            const relative = posix.join(directory, entry.name);
            if (entry.isDirectory()) await visit(relative);
            else if (entry.isFile())
                files.set(relative, await readFile(join(root, relative), 'utf8'));
            else throw new Error(`Unexpected file type in generated documentation: ${relative}.`);
        }
    }
    for (const directory of await generatedDirectories(root)) await visit(directory);
    return files;
}
