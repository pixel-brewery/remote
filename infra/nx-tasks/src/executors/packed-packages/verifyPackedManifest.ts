// #region Imports
import assert from 'node:assert/strict';
import type { IPackedExport } from './interfaces/IPackedExport.js';
import type { IPackedPackageDefinition } from './interfaces/IPackedPackageDefinition.js';
import type { IPackedPackageManifest } from './interfaces/IPackedPackageManifest.js';
// #endregion

/**
 * Checks actual archive metadata, publication boundaries and every export target.
 * @param definition - Fixed package identity and dependency-direction policy.
 * @param manifest - Manifest read directly from the tarball.
 * @param files - Actual tar inventory, including its package/ prefix.
 * @param publicVersions - Root-declared exact versions of public runtime dependencies.
 * @returns Every explicit public entry that the isolated consumer must resolve.
 * @throws An error for invalid metadata, missing output, unsafe paths or dependency drift.
 * @public
 */
export function verifyPackedManifest(
    definition: IPackedPackageDefinition,
    manifest: IPackedPackageManifest,
    files: readonly string[],
    publicVersions: Readonly<Record<string, string>>,
): readonly IPackedExport[] {
    assert.equal(manifest.name, definition.name, 'Packed package identity changed.');
    assert.match(
        manifest.version,
        /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u,
        'Publish an exact stable package version.',
    );
    assert.equal(manifest.type, 'module', `${definition.name} must publish ESM.`);
    assert.equal(manifest.license, 'MIT', `${definition.name} must declare its MIT license.`);
    assert(
        Array.isArray(manifest.files) &&
            manifest.files.length > 0 &&
            manifest.files.every((pattern) => typeof pattern === 'string' && pattern.length > 0),
        `${definition.name}: Declare a nonempty published-files pattern list.`,
    );
    // npm supports rooted globs and automatic license inclusion. The actual tar
    // inventory and every resolved export target are the publication authority.
    assert(
        files.includes('package/package.json') && files.includes('package/LICENSE'),
        `${definition.name}: Packed metadata and LICENSE are required.`,
    );
    assert(files.length < 10000, 'Packed file inventory exceeds its bound.');
    for (const path of files) {
        assert(
            !path.includes('\\') &&
                !path.split('/').includes('..') &&
                !/[\u0000-\u001f]/u.test(path),
            'Unsafe packed path.',
        );
        assert(path.startsWith('package/'), 'Archive files must belong to package/.');
        const local = path.slice('package/'.length).replace(/\/$/u, '');
        if (!local) continue;
        assert(
            !/(?:^|\/)(?:node_modules|\.git|\.gradle|\.build|build|coverage|\.env(?:\..*)?|\.npmrc)(?:\/|$)/u.test(
                local,
            ) && !local.endsWith('.tsbuildinfo'),
            `${definition.name}: Unexpected published local state: ${local}`,
        );
        const allowed = ['package.json', 'LICENSE', 'README.md', 'dist'];
        if (definition.name.endsWith('-capacitor')) allowed.push('android', 'ios', 'Package.swift');
        assert(
            allowed.some((prefix) => local === prefix || local.startsWith(prefix + '/')),
            `${definition.name}: Unexpected published source: ${local}`,
        );
    }
    const dependencies = { ...manifest.dependencies, ...manifest.optionalDependencies };
    const sdkDependencies = Object.keys(dependencies)
        .filter((name) => name.startsWith('@pixel-brewery/remote-'))
        .sort();
    assert.deepEqual(
        sdkDependencies,
        [...definition.sdkDependencies].sort(),
        `${definition.name} violates the inward SDK package graph.`,
    );
    for (const [name, version] of Object.entries(dependencies)) {
        if (name.startsWith('@pixel-brewery/remote-'))
            assert.equal(
                version,
                manifest.version,
                'Packed SDK dependencies must use the common exact version.',
            );
        else {
            assert(
                !definition.portable || name === 'zod',
                'Portable SDK packages may depend only on the protocol schemas and inward SDK owners.',
            );
            assert.match(
                version,
                /^\d+\.\d+\.\d+$/u,
                'Public runtime dependencies must use exact versions.',
            );
            assert.equal(
                version,
                publicVersions[name],
                `Public dependency ${name} must match its root pin.`,
            );
        }
    }
    for (const [name, version] of Object.entries(manifest.peerDependencies ?? {})) {
        assert(
            !/^(?:workspace:|file:|link:|portal:|git[+:]|https?:)/u.test(version),
            'Published peers must not reference workspace or external paths.',
        );
        assert(
            !definition.portable || name === 'zod' || definition.sdkDependencies.includes(name),
            'Portable SDK packages must not expose platform peers.',
        );
    }
    assert(
        manifest.exports &&
            typeof manifest.exports === 'object' &&
            !Array.isArray(manifest.exports),
        'Publish an explicit export map.',
    );
    const entries: IPackedExport[] = [];
    for (const [key, value] of Object.entries(manifest.exports)) {
        assert(
            (key === '.' || key.startsWith('./')) &&
                !key.includes('*') &&
                !key.split('/').includes('..'),
            'Publish explicit safe export entries.',
        );
        const json = key === './package.json';
        if (json) assert.equal(value, './package.json');
        else {
            assert(
                value &&
                    typeof value === 'object' &&
                    !Array.isArray(value) &&
                    typeof (value as Record<string, unknown>)['types'] === 'string' &&
                    typeof (value as Record<string, unknown>)['import'] === 'string',
                'Each public API requires types and import targets.',
            );
            assert(
                /\.d\.(?:m|c)?ts$/u.test((value as Record<string, string>)['types'] ?? ''),
                'Public types must point to declaration files.',
            );
            assert(
                /\.(?:m)?js$/u.test((value as Record<string, string>)['import'] ?? ''),
                'Public import targets must point to built ESM.',
            );
        }
        const targets: string[] = [];
        const collect = (target: unknown): void => {
            if (typeof target === 'string') targets.push(target);
            else {
                assert(
                    target && typeof target === 'object' && !Array.isArray(target),
                    'Unsupported export target.',
                );
                Object.values(target).forEach(collect);
            }
        };
        collect(value);
        for (const target of targets) {
            assert(
                target.startsWith('./') &&
                    !target.includes('\\') &&
                    !target.split('/').includes('..'),
                'Export targets must remain inside their artifact.',
            );
            assert(
                files.includes('package/' + target.slice(2)),
                `${definition.name}: Missing packed export target: ${target}`,
            );
        }
        entries.push({
            specifier: definition.name + (key === '.' ? '' : key.slice(1)),
            json,
            runtime: definition.runtime && !json,
        });
    }
    assert(
        entries.some((entry) => !entry.json) && entries.some((entry) => entry.json),
        'Publish API entries and package metadata.',
    );
    return entries;
}
