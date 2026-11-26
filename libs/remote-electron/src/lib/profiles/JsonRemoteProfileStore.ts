// #region Imports
import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, lstat, mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';
import type { IRemoteProfileStore, IRemoteSavedConnection } from '@pixel-brewery/remote-client';
import {
    remoteHostIdentitySchema,
    remoteSavedConnectionSchema,
} from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Private JSON file of credential-free saved connection profiles for one application namespace.
 *
 * @remarks Use one instance per profile file inside the network-owning Utility Process. Writes are
 * validated before they are queued, serialized in caller order, flushed and then atomically renamed
 * over the previous file, so a failed replacement leaves the last committed file readable. Reads wait
 * for queued writes and return only committed metadata. No handle stays open between calls. The
 * canonical strict profile schema rejects credential or other additional fields; device credentials
 * belong exclusively to the Main-owned OS vault.
 * @public
 */
export class JsonRemoteProfileStore implements IRemoteProfileStore {
    // #region Fields
    private _queue: Promise<void> = Promise.resolve();
    // #endregion
    // #region Ctor
    /**
     * Select the private profile file and the only application namespace it may contain.
     *
     * @param _path - Absolute application-owned file path. Its directory is created with mode 0700 on first save.
     * @param _appId - Canonical lowercase application namespace every stored profile must belong to.
     * @throws Error when the path is relative or the namespace is not a canonical application identifier.
     * @public
     */
    public constructor(
        private readonly _path: string,
        private readonly _appId: string,
    ) {
        if (!isAbsolute(_path))
            throw new Error('Remote profile storage requires an absolute path.');
        if (!remoteHostIdentitySchema.safeParse({ appId: _appId, hostId: 'profiles' }).success)
            throw new Error('Remote profile storage requires a canonical application namespace.');
    }
    // #endregion
    // #region Methods
    /**
     * Load the committed profiles of this application namespace.
     *
     * @returns Validated safe profiles, or an empty collection when the file does not exist yet.
     * @throws Error when the file is not a bounded regular file, is malformed, holds more than 64
     * profiles, repeats an identifier or contains another application's profile.
     * @public
     */
    public async load(): Promise<readonly IRemoteSavedConnection[]> {
        await this._queue;
        let info;
        try {
            info = await lstat(this._path);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
            throw error;
        }
        if (!info.isFile() || info.isSymbolicLink() || info.size > 524_288)
            throw new Error('Remote profiles require a bounded regular file.');
        return this.parse(JSON.parse(await readFile(this._path, 'utf8')) as unknown);
    }
    /**
     * Durably replace the complete profile collection.
     *
     * @param profiles - Complete credential-free snapshot. It is validated and copied before queuing,
     * so later caller mutations do not reach the file.
     * @returns Completion after the flushed private file has atomically replaced its predecessor.
     * @throws Error synchronously for invalid, duplicate, foreign or credential-bearing metadata, and
     * through the returned promise when the directory is unsafe or persistence fails.
     * @public
     */
    public save(profiles: readonly IRemoteSavedConnection[]): Promise<void> {
        const safe = JSON.stringify(this.parse(profiles)) + '\n';
        const operation = this._queue.then(async () => {
            const directory = dirname(this._path);
            await mkdir(directory, { recursive: true, mode: 0o700 });
            const info = await lstat(directory);
            if (!info.isDirectory() || info.isSymbolicLink())
                throw new Error('Remote profiles require a private regular directory.');
            await chmod(directory, 0o700);
            const temporary = `${this._path}.${randomUUID()}.next`;
            const file = await open(
                temporary,
                constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
                0o600,
            );
            try {
                await file.writeFile(safe);
                await file.sync();
                await file.close();
                await rename(temporary, this._path);
            } catch (error) {
                await file.close().catch(() => undefined);
                await unlink(temporary).catch(() => undefined);
                throw error;
            }
        });
        this._queue = operation.catch(() => undefined);
        return operation;
    }
    private parse(value: unknown): readonly IRemoteSavedConnection[] {
        if (!Array.isArray(value) || value.length > 64) throw new Error('Invalid remote profiles.');
        const profiles = value.map((profile) => remoteSavedConnectionSchema.parse(profile));
        if (
            profiles.some((profile) => profile.identity.appId !== this._appId) ||
            new Set(profiles.map((profile) => profile.id)).size !== profiles.length
        )
            throw new Error('Remote profile namespace or identifier mismatch.');
        return profiles;
    }
    // #endregion
}
