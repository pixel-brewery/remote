// #region Imports
import { mkdir, readFile, open, rename, rm, lstat } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { remoteAccessStateSchema, type IRemoteAccessState } from '@pixel-brewery/remote-protocol';
import type { IRemoteAccessStore } from '@pixel-brewery/remote-core';
// #endregion
/**
 * Atomic private-file persistence. The application selects the file and owns its data lifecycle.
 *
 * @public
 */
export class JsonRemoteAccessStore implements IRemoteAccessStore {
    // #region Ctor
    /**
     * Binds an application-owned path without creating or reading anything.
     *
     * @param _path - Application-selected private record path with one active writer.
     * @public
     */
    public constructor(private readonly _path: string) {}
    // #endregion
    // #region Methods
    /**
     * Reads unknown storage for canonical validation by the access owner.
     *
     * @returns Unknown persisted data, or null when no record exists.
     * @throws A filesystem or JSON parse error for unreadable, malformed or symbolic-link storage.
     * @public
     */
    public async load(): Promise<unknown> {
        try {
            if ((await lstat(this._path)).isSymbolicLink())
                throw new Error('Device storage cannot be a symbolic link.');
            return JSON.parse(await readFile(this._path, 'utf8')) as unknown;
        } catch (cause) {
            if (
                typeof cause === 'object' &&
                cause !== null &&
                'code' in cause &&
                cause.code === 'ENOENT'
            )
                return null;
            throw cause;
        }
    }
    /**
     * Writes and flushes a private temporary file before an atomic replacement.
     *
     * @param state - Complete canonical access record to replace atomically; a rejected write must preserve the preceding record.
     * @returns Resolves only after the replacement commits; rejects without changing the previous record.
     * @remarks Temporary files use exclusive creation and mode 0600. The file is flushed before atomic rename. Use one writer per installation.
     * @throws A validation or filesystem error when the new record cannot be committed.
     * @public
     */
    public async save(state: IRemoteAccessState): Promise<void> {
        const validated = remoteAccessStateSchema.parse(state);
        await mkdir(dirname(this._path), { recursive: true, mode: 0o700 });
        const temporaryPath = `${this._path}.${randomUUID()}.tmp`;
        try {
            const file = await open(temporaryPath, 'wx', 0o600);
            try {
                await file.writeFile(JSON.stringify(validated) + '\n', 'utf8');
                await file.sync();
            } finally {
                await file.close();
            }
            await rename(temporaryPath, this._path);
        } finally {
            await rm(temporaryPath, { force: true });
        }
    }
    // #endregion
}
