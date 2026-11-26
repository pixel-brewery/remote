// #region Imports
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, mkdir, open, readFile, rename, lstat, unlink } from 'node:fs/promises';
import { dirname, isAbsolute, join } from 'node:path';
import type { IRemoteCredentialStore } from '@pixel-brewery/remote-client';
import type { IRemoteHostIdentity } from '@pixel-brewery/remote-protocol';
import type { IElectronSafeStorage } from './interfaces/IElectronSafeStorage.js';
// #endregion

/**
 * Main-owned OS-encrypted atomic credential records, namespaced by app and host.
 * @remarks Construct only after Electron app readiness. basic_text is rejected; no plaintext fallback exists.
 * @public
 */
export class ElectronCredentialVault implements IRemoteCredentialStore {
    // #region Fields
    private _queue: Promise<unknown> = Promise.resolve();
    // #endregion
    // #region Ctor
    /**
     * Compose the private record path and Electron Main safeStorage capability.
     * @param _path - Absolute application-private credential file path.
     * @param _safeStorage - OS-backed encryption API, kept outside Utility and renderer.
     * @throws Error for relative paths or unavailable/insecure storage backends.
     * @public
     */
    public constructor(
        private readonly _path: string,
        private readonly _safeStorage: IElectronSafeStorage,
    ) {
        if (!isAbsolute(_path)) throw new Error('The vault path must be absolute.');
        this.requireEncryption();
    }
    // #endregion
    // #region Methods
    /**
     * Decrypt only the selected application's installation credential.
     * @param identity - Exact product and host namespace.
     * @returns Credential, or null when that namespace is absent.
     * @throws Error for malformed records or unavailable OS encryption.
     * @public
     */
    public async get(identity: IRemoteHostIdentity): Promise<string | null> {
        await this._queue;
        this.requireEncryption();
        const record = (await this.read())[this.key(identity)];
        return record === undefined
            ? null
            : this._safeStorage.decryptString(Buffer.from(record, 'base64'));
    }
    /**
     * Encrypt and atomically replace one installation's credential.
     * @param identity - Product and host namespace established before credential dispatch.
     * @param credential - Opaque server-issued secret, bounded to 256 characters.
     * @returns Durable encrypted-file replacement completion.
     * @public
     */
    public set(identity: IRemoteHostIdentity, credential: string): Promise<void> {
        if (credential.length < 32 || credential.length > 256)
            return Promise.reject(new Error('Invalid credential size.'));
        return this.serialize(async () => {
            this.requireEncryption();
            const records = await this.read();
            records[this.key(identity)] = this._safeStorage
                .encryptString(credential)
                .toString('base64');
            await this.write(records);
        });
    }
    /**
     * Remove one local credential while preserving all other installations.
     * @param identity - Exact namespace to remove.
     * @returns Atomic update completion.
     * @public
     */
    public delete(identity: IRemoteHostIdentity): Promise<void> {
        return this.serialize(async () => {
            const records = await this.read();
            delete records[this.key(identity)];
            await this.write(records);
        });
    }
    private requireEncryption(): void {
        if (
            !this._safeStorage.isEncryptionAvailable() ||
            this._safeStorage.getSelectedStorageBackend?.() === 'basic_text'
        )
            throw new Error('OS-backed credential encryption is unavailable.');
    }
    private key(identity: IRemoteHostIdentity): string {
        return createHash('sha256')
            .update(identity.appId)
            .update('\0')
            .update(identity.hostId)
            .digest('hex');
    }
    private async read(): Promise<Record<string, string>> {
        let stat;
        try {
            stat = await lstat(this._path);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT')
                return Object.create(null) as Record<string, string>;
            throw error;
        }
        if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2_097_152)
            throw new Error('The credential file is not a bounded regular file.');
        const parsed: unknown = JSON.parse(await readFile(this._path, 'utf8'));
        if (typeof parsed !== 'object' || !parsed || Array.isArray(parsed))
            throw new Error('Malformed credential records.');
        const records: Record<string, string> = Object.create(null) as Record<string, string>;
        const entries = Object.entries(parsed);
        if (entries.length > 1024) throw new Error('Too many credential records.');
        for (const [key, value] of entries) {
            if (
                !/^[a-f0-9]{64}$/u.test(key) ||
                typeof value !== 'string' ||
                value.length > 8192 ||
                !/^[A-Za-z0-9+/]+=*$/u.test(value)
            )
                throw new Error('Malformed encrypted credential record.');
            records[key] = value;
        }
        return records;
    }
    private async write(records: Record<string, string>): Promise<void> {
        const directory = dirname(this._path);
        await mkdir(directory, { recursive: true, mode: 0o700 });
        const stat = await lstat(directory);
        if (!stat.isDirectory() || stat.isSymbolicLink())
            throw new Error('The vault directory must be a private regular directory.');
        await chmod(directory, 0o700);
        const temporary = join(directory, `.remote-${randomUUID()}.tmp`);
        const handle = await open(
            temporary,
            constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
            0o600,
        );
        try {
            await handle.writeFile(JSON.stringify(records));
            await handle.sync();
            await handle.close();
            await rename(temporary, this._path);
            await chmod(this._path, 0o600);
        } catch (error) {
            await handle.close().catch(() => undefined);
            await unlink(temporary).catch(() => undefined);
            throw error;
        }
    }
    private serialize(action: () => Promise<void>): Promise<void> {
        const result = this._queue.then(action);
        this._queue = result.catch(() => undefined);
        return result;
    }
    // #endregion
}
