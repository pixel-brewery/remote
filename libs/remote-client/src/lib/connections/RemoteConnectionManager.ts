// #region Imports
import { remoteSavedConnectionSchema } from '@pixel-brewery/remote-protocol';
import type { RemoteSession } from '../session/RemoteSession.js';
import type { IRemoteConnectionManagerOptions } from './interfaces/IRemoteConnectionManagerOptions.js';
import type { IRemoteSavedConnection } from './interfaces/IRemoteSavedConnection.js';
// #endregion

/**
 * Serializes durable safe-profile selection and owns one active session.
 * @remarks Persistence commits before the visible profile set changes. Credentials use a separate privileged port.
 * @public
 */
export class RemoteConnectionManager {
    // #region Fields
    private _profiles: readonly IRemoteSavedConnection[] = [];
    private _activeSession: RemoteSession | undefined;
    private _activeConnectionId: string | undefined;
    private _queue: Promise<unknown> = Promise.resolve();
    private _disposed = false;
    // #endregion
    // #region Ctor
    /**
     * Compose product-scoped profile persistence and session creation.
     * @param _options - Application namespace, store and connector-aware session factory.
     * @public
     */
    public constructor(private readonly _options: IRemoteConnectionManagerOptions) {}
    // #endregion
    // #region Properties
    /**
     * Validated immutable credential-free profiles loaded by initialize.
     * @public
     */
    public get profiles(): readonly IRemoteSavedConnection[] {
        return this._profiles;
    }
    /**
     * Session currently owned by this manager, when selected.
     * @public
     */
    public get activeSession(): RemoteSession | undefined {
        return this._activeSession;
    }
    /**
     * Identifier associated with the active session.
     * @public
     */
    public get activeConnectionId(): string | undefined {
        return this._activeConnectionId;
    }
    // #endregion
    // #region Methods
    /**
     * Load and validate the product's existing profile metadata.
     * @returns Completion after all identities and endpoint selections are checked.
     * @throws Error for duplicate identifiers, another app namespace or malformed profiles.
     * @public
     */
    public initialize(): Promise<void> {
        return this.serialize(async () => {
            this._profiles = this.validate(await this._options.store.load());
        });
    }
    /**
     * Atomically persist one safe profile, replacing its previous record.
     * @param profile - Metadata with no bearer credential or pairing challenge.
     * @returns Durable save completion; a selected old version is disposed afterwards.
     * @public
     */
    public save(profile: IRemoteSavedConnection): Promise<void> {
        return this.serialize(async () => {
            const next = this.validate([
                ...this._profiles.filter((value) => value.id !== profile.id),
                profile,
            ]);
            await this._options.store.save(next);
            this._profiles = next;
            if (this._activeConnectionId === profile.id) await this.closeCurrent();
        });
    }
    /**
     * Close the previous session and restore one saved connection.
     * @param connectionId - Identifier selected from profiles.
     * @returns The newly owned session after initialization.
     * @throws Error when the selected profile does not exist.
     * @public
     */
    public activate(connectionId: string): Promise<RemoteSession> {
        return this.serialize(async () => {
            const profile = this._profiles.find((value) => value.id === connectionId);
            if (!profile) throw new Error('The connection does not exist.');
            await this.closeCurrent();
            const session = this._options.createSession(profile);
            this._activeSession = session;
            this._activeConnectionId = connectionId;
            await session.initialize();
            return session;
        });
    }
    /**
     * Cancel the selected view without deleting a profile or host grant.
     * @returns Session cleanup completion.
     * @public
     */
    public disconnect(): Promise<void> {
        return this.serialize(() => this.closeCurrent());
    }
    /**
     * Forget one profile and its optional privileged credential.
     * @param connectionId - Stored identifier; absent identifiers are a no-op.
     * @returns Durable metadata update and owned session cleanup completion.
     * @public
     */
    public forget(connectionId: string): Promise<void> {
        return this.serialize(async () => {
            const profile = this._profiles.find((value) => value.id === connectionId);
            if (!profile) return;
            if (this._activeConnectionId === connectionId) await this.closeCurrent();
            await this._options.forgetCredential?.(profile.identity);
            const next = Object.freeze(this._profiles.filter((value) => value.id !== connectionId));
            await this._options.store.save(next);
            this._profiles = next;
        });
    }
    /**
     * Close the active session and permanently dispose this manager.
     * @returns Idempotent cleanup completion.
     * @public
     */
    public dispose(): Promise<void> {
        if (this._disposed) return Promise.resolve();
        return this.serialize(async () => {
            await this.closeCurrent();
            this._disposed = true;
        });
    }
    private validate(
        profiles: readonly IRemoteSavedConnection[],
    ): readonly IRemoteSavedConnection[] {
        if (profiles.length > 64) throw new Error('Too many saved connections.');
        const ids = new Set<string>();
        return Object.freeze(
            profiles.map((value) => {
                const { id, label, identity, endpoints, selectedEndpointId } = value;
                const profile = remoteSavedConnectionSchema.parse({
                    id,
                    label,
                    identity,
                    endpoints,
                    selectedEndpointId,
                });
                if (profile.identity.appId !== this._options.appId || ids.has(profile.id))
                    throw new Error('Duplicate connection or invalid product namespace.');
                ids.add(profile.id);
                return profile;
            }),
        );
    }
    private async closeCurrent(): Promise<void> {
        const session = this._activeSession;
        this._activeSession = undefined;
        this._activeConnectionId = undefined;
        await session?.dispose();
    }
    private serialize<T>(action: () => Promise<T>): Promise<T> {
        const result = this._queue.then(() => {
            if (this._disposed) throw new Error('The connection manager is disposed.');
            return action();
        });
        this._queue = result.catch(() => undefined);
        return result;
    }
    // #endregion
}
