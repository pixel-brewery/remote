// #region Imports
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstat, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IPackedArchive } from '../packed-packages/interfaces/IPackedArchive.js';
import type { IPackedCommandRunner } from '../packed-packages/interfaces/IPackedCommandRunner.js';
import { createReleaseEnvironment } from './createReleaseEnvironment.js';
import type { IReleaseCandidate } from './interfaces/IReleaseCandidate.js';
import type { IReleaseRequest } from './interfaces/IReleaseRequest.js';
import { releaseFields as fields } from './releaseFields.js';
import { releasePolicy as policy } from './releasePolicy.js';
// #endregion

/**
 * Compares every registry version and downloads its actual bytes before accepting it.
 * @remarks The public npm CLI owns publishing and downloads. Existing versions are
 * never rewritten, deleted or assumed correct from their version string. Missing
 * public ACLs remain an explicit owner/UI blocker after verified upload.
 * @param directory - Same retained candidate directory, never a rebuilt source tree.
 * @param candidate - Complete checked tar family and exact source identity.
 * @param request - Package identity, actual version and public-visibility evidence.
 * @param command - Literal official npm CLI boundary.
 * @param env - Bootstrap token source; only NODE_AUTH_TOKEN reaches npm.
 * @param publish - Explicit manual write phase; false is registry-read-only.
 * @param beforeWrite - Revalidates manual approval, exact current main, CI and immutable tag.
 * @returns Nine verified public package names after real metadata and download checks.
 * @throws An error for a conflict, partial failure, missing version or private ACL.
 * @public
 */
export async function operateReleaseRegistry(
    directory: string,
    candidate: IReleaseCandidate,
    request: IReleaseRequest,
    command: IPackedCommandRunner,
    env: Readonly<NodeJS.ProcessEnv>,
    publish: boolean,
    beforeWrite: () => Promise<void>,
): Promise<readonly string[]> {
    const token = env['GITHUB_TOKEN'] ?? env['GH_TOKEN'];
    assert(token, 'Registry verification requires the existing package-readable token.');
    const temporary = await mkdtemp(join(tmpdir(), 'remote-package-registry-'));
    try {
        const config = join(temporary, 'npmrc');
        const global = join(temporary, 'global-npmrc');
        await writeFile(
            config,
            '@pixel-brewery:registry=' +
                policy.registry +
                '\n//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}\n',
            { mode: 0o600 },
        );
        await writeFile(global, '', { mode: 0o600 });
        const environment: NodeJS.ProcessEnv = {
            ...createReleaseEnvironment(env),
            NODE_AUTH_TOKEN: token,
            NPM_CONFIG_USERCONFIG: config,
            NPM_CONFIG_GLOBALCONFIG: global,
            NPM_CONFIG_CACHE: join(temporary, 'cache'),
            NPM_CONFIG_REGISTRY: policy.registry,
            NPM_CONFIG_IGNORE_SCRIPTS: 'true',
        };
        const npm = async (args: readonly string[]): Promise<string> => {
            try {
                return await command('npm', args, temporary, environment);
            } catch (error) {
                const diagnostic = fields(error);
                let code: unknown;
                for (const text of [diagnostic['stdout'], diagnostic['stderr']]) {
                    if (typeof text !== 'string') continue;
                    try {
                        code = fields(fields(JSON.parse(text))['error'])['code'];
                    } catch {
                        /* No command output is exposed. */
                    }
                    if (code) break;
                }
                throw Object.assign(
                    new Error(
                        `Official npm ${args[0] ?? 'command'} failed; retained candidate is preserved.`,
                    ),
                    { registryCode: code },
                );
            }
        };
        const decode = (text: string): unknown => {
            try {
                return JSON.parse(text) as unknown;
            } catch {
                throw new Error('Official npm returned invalid registry metadata.');
            }
        };
        const packageMetadata = async (
            archive: IPackedArchive,
        ): Promise<Record<string, unknown> | undefined> => {
            const name = archive.name.split('/')[1]!;
            let response: unknown;
            try {
                response = await request('GET', `orgs/pixel-brewery/packages/npm/${name}`);
            } catch (error) {
                if (fields(error)['status'] === 404) return undefined;
                throw error;
            }
            const value = fields(response);
            assert.equal(value['name'], name);
            assert.equal(value['package_type'], 'npm');
            assert.equal(
                fields(value['repository'])['id'],
                policy.repositoryId,
                'Package is linked to another repository.',
            );
            assert.equal(fields(value['repository'])['full_name'], policy.repository);
            return value;
        };
        const inspect = async (
            archive: IPackedArchive,
            allowMissing: boolean,
        ): Promise<boolean> => {
            await packageMetadata(archive);
            let response: unknown;
            try {
                response = decode(
                    await npm([
                        'view',
                        `${archive.name}@${archive.version}`,
                        '--json',
                        '--registry=' + policy.registry,
                    ]),
                );
            } catch (error) {
                if (allowMissing && fields(error)['registryCode'] === 'E404') return false;
                throw error;
            }
            if (Array.isArray(response)) {
                assert.equal(response.length, 1);
                response = response[0];
            }
            const manifest = fields(response);
            assert.equal(manifest['name'], archive.name);
            assert.equal(manifest['version'], archive.version);
            assert.equal(
                fields(manifest['dist'])['integrity'],
                archive.integrity,
                'Published version has different content; never overwrite or delete it.',
            );
            const packed = decode(
                await npm([
                    'pack',
                    `${archive.name}@${archive.version}`,
                    '--ignore-scripts',
                    '--json',
                    '--pack-destination',
                    temporary,
                    '--registry=' + policy.registry,
                ]),
            );
            assert(Array.isArray(packed) && packed.length === 1);
            const filename = fields(packed[0])['filename'];
            assert(
                typeof filename === 'string' && /^[A-Za-z0-9._-]+[.]tgz$/u.test(filename),
                'Registry download filename is invalid.',
            );
            const path = join(temporary, filename);
            const info = await lstat(path);
            assert(info.isFile() && !info.isSymbolicLink() && info.size === archive.bytes);
            const bytes = await readFile(path);
            assert.equal(createHash('sha256').update(bytes).digest('hex'), archive.sha256);
            assert.equal(
                'sha512-' + createHash('sha512').update(bytes).digest('base64'),
                archive.integrity,
            );
            await rm(path);
            return true;
        };
        const missing: IPackedArchive[] = [];
        for (const archive of candidate.archives)
            if (!(await inspect(archive, publish))) missing.push(archive);
        if (publish) {
            // This callback creates the checked source tag before the first registry write.
            await beforeWrite();
            for (const archive of missing) {
                await beforeWrite();
                await npm([
                    'publish',
                    join(directory, archive.file),
                    '--ignore-scripts',
                    '--access=public',
                    '--tag=latest',
                    '--json',
                    '--registry=' + policy.registry,
                ]);
            }
        }
        const privatePackages: string[] = [];
        for (const archive of candidate.archives) {
            assert(await inspect(archive, false), 'Every package version must actually exist.');
            const metadata = await packageMetadata(archive);
            assert(metadata, 'Published package metadata is unavailable.');
            const versions = await request(
                'GET',
                `orgs/pixel-brewery/packages/npm/${archive.name.split('/')[1]}/versions?per_page=100`,
            );
            assert(
                Array.isArray(versions) && versions.length < 100,
                'Package-version inventory exceeds its verified initial-release bound.',
            );
            const matching = versions
                .map(fields)
                .filter((version) => version['name'] === archive.version);
            assert.equal(
                matching.length,
                1,
                'Exact published package version must be visible through GitHub.',
            );
            assert(Number.isSafeInteger(matching[0]!['id']) && Number(matching[0]!['id']) > 0);
            if (metadata['visibility'] !== 'public') privatePackages.push(archive.name);
        }
        assert(
            privatePackages.length === 0,
            'Public package visibility requires owner action in GitHub Package settings; upload bytes are retained and verified: ' +
                privatePackages.join(', '),
        );
        return candidate.archives.map((archive) => archive.name);
    } finally {
        await rm(temporary, { recursive: true, force: true });
    }
}
