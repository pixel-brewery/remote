// #region Imports
import { createHash, randomUUID } from 'node:crypto';
import type { IRemoteClientTransport, IRemoteSavedConnection } from '@pixel-brewery/remote-client';
import { NodeLocalGateway, NodeRemoteConnector } from '@pixel-brewery/remote-node/client';
import {
    remotePairingBootstrapSchema,
    remoteSavedConnectionSchema,
    type IRemotePairingBootstrap,
} from '@pixel-brewery/remote-protocol';
import type { IRemoteElectronUtilityOptions } from './interfaces/IRemoteElectronUtilityOptions.js';
// #endregion

/**
 * Utility-owned native remote channel and authenticated packaged-content gateway.
 * @remarks The application supplies a Main-mediated credential port. No plaintext secret or private gateway cookie is sent to renderer JS.
 * @public
 */
export class ElectronRemoteUtility {
    // #region Fields
    private _gateway: NodeLocalGateway | undefined;
    private _transport: IRemoteClientTransport | undefined;
    private _controller: AbortController | undefined;
    private _connectionId: string | undefined;
    private _queue: Promise<unknown> = Promise.resolve();
    private _disposed = false;
    private readonly _attempts = new Map<string, { id: string; expiresAt: number; name: string }>();
    // #endregion
    // #region Ctor
    /**
     * Compose immutable application-owned policy and runtime ports.
     * @param _options - Product identity, packaged assets, registered routes and private persistence.
     * @public
     */
    public constructor(private readonly _options: IRemoteElectronUtilityOptions) {}
    // #endregion
    // #region Methods
    /**
     * Read safe profile metadata without decrypting credentials.
     * @returns Validated profiles limited to this application's namespace.
     * @throws Error if persistence contains another application's identity.
     * @public
     */
    public async listConnections(): Promise<readonly IRemoteSavedConnection[]> {
        const profiles = (await this._options.profileStore.load()).map((value) =>
            remoteSavedConnectionSchema.parse(value),
        );
        if (profiles.some((profile) => profile.identity.appId !== this._options.appId))
            throw new Error('Profile product namespace mismatch.');
        return profiles;
    }
    /**
     * Complete a native bearer pairing, save its safe profile and activate packaged content.
     * @param bootstrap - Unexpired invitation for the immutable product namespace.
     * @param deviceName - User-selected device label; stable across recovery of one attempt.
     * @returns Privileged activation descriptor for Main, including its private local cookie.
     * @throws Error when host approval is pending, storage fails or verified identities mismatch.
     * @public
     */
    public pair(
        bootstrap: IRemotePairingBootstrap,
        deviceName: string,
    ): Promise<Awaited<ReturnType<NodeLocalGateway['start']>>> {
        return this.serialize(async () => {
            const invitation = remotePairingBootstrapSchema.parse(bootstrap),
                name = deviceName.trim();
            if (
                invitation.appId !== this._options.appId ||
                Date.parse(invitation.expiresAt) <= Date.now() ||
                !name ||
                name.length > 120
            )
                throw new Error('Invalid or expired pairing invitation.');
            const profileId = this.connectionId(invitation.appId, invitation.hostId),
                endpoint = {
                    id: 'primary',
                    transportId:
                        new URL(invitation.origin).protocol === 'https:' ? 'lan-https' : 'lan-http',
                    origin: invitation.origin,
                };
            await this.closeCurrent();
            const controller = new AbortController();
            this._controller = controller;
            const transport = await this.connector(
                { appId: invitation.appId, hostId: invitation.hostId },
                endpoint.transportId,
            ).connect(endpoint, controller.signal);
            this._transport = transport;
            try {
                const host = await transport.describe(controller.signal);
                for (const [key, value] of this._attempts)
                    if (value.expiresAt <= Date.now()) this._attempts.delete(key);
                if (this._attempts.size >= 16 && !this._attempts.has(invitation.challenge))
                    throw new Error('Too many pending invitations.');
                const attempt = this._attempts.get(invitation.challenge) ?? {
                    id: randomUUID(),
                    expiresAt: Date.parse(invitation.expiresAt),
                    name,
                };
                if (attempt.name !== name)
                    throw new Error('An existing attempt cannot change its device label.');
                this._attempts.set(invitation.challenge, attempt);
                const result = await transport.pair(
                    invitation,
                    name,
                    attempt.id,
                    controller.signal,
                );
                if (result.status !== 'paired')
                    throw new Error(
                        'Host approval is pending; retry the same invitation after approval.',
                    );
                const selected = host.endpoints.find((value) => value.origin === invitation.origin);
                if (!selected)
                    throw new Error(
                        'The verified host did not advertise this invitation endpoint.',
                    );
                const profile = remoteSavedConnectionSchema.parse({
                    id: profileId,
                    identity: host.identity,
                    label: host.name,
                    endpoints: host.endpoints,
                    selectedEndpointId: selected.id,
                });
                const profiles = await this.listConnections();
                await this._options.profileStore.save([
                    ...profiles.filter((value) => value.id !== profileId),
                    profile,
                ]);
                this._attempts.delete(invitation.challenge);
                return await this.openGateway(profileId, host.identity, transport);
            } catch (error) {
                await this.closeCurrent();
                throw error;
            }
        });
    }
    /**
     * Restore a saved host and start its isolated authenticated loopback view.
     * @param connectionId - Exact selected safe-profile identifier.
     * @returns Main-only activation descriptor after public host identity and session validation.
     * @throws Error when a profile is absent, revoked or unreachable.
     * @public
     */
    public openConnection(
        connectionId: string,
    ): Promise<Awaited<ReturnType<NodeLocalGateway['start']>>> {
        return this.serialize(async () => {
            const profile = (await this.listConnections()).find(
                (value) => value.id === connectionId,
            );
            if (!profile) throw new Error('The saved connection does not exist.');
            const endpoint = profile.endpoints.find(
                (value) => value.id === profile.selectedEndpointId,
            );
            if (!endpoint) throw new Error('The saved endpoint does not exist.');
            await this.closeCurrent();
            const controller = new AbortController();
            this._controller = controller;
            const transport = await this.connector(profile.identity, endpoint.transportId).connect(
                endpoint,
                controller.signal,
            );
            this._transport = transport;
            try {
                await transport.describe(controller.signal);
                if (!(await transport.session(controller.signal)))
                    throw new Error('The device must be paired again.');
                return await this.openGateway(connectionId, profile.identity, transport);
            } catch (error) {
                await this.closeCurrent();
                throw error;
            }
        });
    }
    /**
     * Cancel one selected view without deleting its persistent grant.
     * @param connectionId - Active view identifier; other identifiers leave it running.
     * @returns Network and gateway cleanup completion.
     * @public
     */
    public closeConnection(connectionId: string): Promise<void> {
        return this.serialize(async () => {
            if (this._connectionId === connectionId) await this.closeCurrent();
        });
    }
    /**
     * Remove one local profile and Main-mediated credential.
     * @param connectionId - Exact stored profile to forget.
     * @returns Durable metadata update after cancellation of that profile's streams.
     * @public
     */
    public forgetConnection(connectionId: string): Promise<void> {
        return this.serialize(async () => {
            const profiles = await this.listConnections(),
                profile = profiles.find((value) => value.id === connectionId);
            if (!profile) return;
            if (this._connectionId === connectionId) await this.closeCurrent();
            await this._options.credentialStore.delete(profile.identity);
            await this._options.profileStore.save(
                profiles.filter((value) => value.id !== connectionId),
            );
        });
    }
    /**
     * Cancel every owned socket, local view and pending pairing during Utility shutdown.
     * @returns Idempotent cleanup completion.
     * @public
     */
    public dispose(): Promise<void> {
        if (this._disposed) return Promise.resolve();
        return this.serialize(async () => {
            await this.closeCurrent();
            this._attempts.clear();
            this._disposed = true;
        });
    }
    private connector(
        identity: { appId: string; hostId: string },
        transportId: string,
    ): NodeRemoteConnector {
        if (transportId !== 'lan-http' && transportId !== 'lan-https')
            throw new Error('Unsupported native transport.');
        return new NodeRemoteConnector({
            expectedIdentity: identity,
            credentialStore: this._options.credentialStore,
            routes: this._options.routes,
            transportId,
            ...(this._options.allowLoopbackForTests === undefined
                ? {}
                : { allowLoopbackForTests: this._options.allowLoopbackForTests }),
        });
    }
    private async openGateway(
        connectionId: string,
        identity: { appId: string; hostId: string },
        transport: IRemoteClientTransport,
    ): Promise<Awaited<ReturnType<NodeLocalGateway['start']>>> {
        const websocketTransport = transport as IRemoteClientTransport & {
            openWebSocket?: (path: string, signal: AbortSignal) => Promise<import('ws').WebSocket>;
        };
        this._gateway = new NodeLocalGateway({
            connectionId,
            identity,
            transport,
            routes: this._options.routes,
            assetsPath: this._options.assetsPath,
            ...(this._options.contentPolicy ? { contentPolicy: this._options.contentPolicy } : {}),
            ...(websocketTransport.openWebSocket
                ? { openWebSocket: websocketTransport.openWebSocket.bind(websocketTransport) }
                : {}),
        });
        const activation = await this._gateway.start();
        this._connectionId = connectionId;
        return activation;
    }
    private async closeCurrent(): Promise<void> {
        this._controller?.abort();
        this._controller = undefined;
        this._connectionId = undefined;
        const gateway = this._gateway,
            transport = this._transport;
        this._gateway = undefined;
        this._transport = undefined;
        await gateway?.dispose();
        await transport?.dispose();
    }
    private connectionId(appId: string, hostId: string): string {
        return createHash('sha256').update(appId).update('\0').update(hostId).digest('hex');
    }
    private serialize<T>(action: () => Promise<T>): Promise<T> {
        const result = this._queue.then(() => {
            if (this._disposed) throw new Error('The Remote Utility runtime is disposed.');
            return action();
        });
        this._queue = result.catch(() => undefined);
        return result;
    }
    // #endregion
}
