// #region Imports
import type { IpcMainInvokeEvent } from 'electron';
import {
    remoteLocalViewSchema,
    remoteNativeRequestSchema,
    remoteNativeResponseSchema,
    type IRemoteNativeResponse,
} from '@pixel-brewery/remote-protocol';
import type { IRemoteElectronMainOptions } from './interfaces/IRemoteElectronMainOptions.js';
import type { IRemoteElectronActivation } from './interfaces/IRemoteElectronActivation.js';
// #endregion

/**
 * Main IPC router validates real sender authority and strips private gateway activation fields.
 * @remarks Main performs credential mediation and view activation; network work stays behind the Utility proxy.
 * @public
 */
export class ElectronRemoteController {
    // #region Ctor
    /**
     * Compose an existing application IPC and Utility boundary.
     * @param _options - Trusted sender predicate, typed Utility proxy and native cookie installer.
     * @public
     */
    public constructor(private readonly _options: IRemoteElectronMainOptions) {}
    // #endregion
    // #region Methods
    /**
     * Handle one fixed-channel invocation after validating its actual Electron event.
     * @param event - Main-provided invocation event, never serialized sender data from JS.
     * @param raw - Untrusted canonical control request.
     * @returns Safe schema-validated response with no gateway cookie or remote bearer credential.
     * @throws Error for subframes, untrusted senders or invalid control operations.
     * @public
     */
    public async handle(event: IpcMainInvokeEvent, raw: unknown): Promise<IRemoteNativeResponse> {
        if (
            !event.senderFrame ||
            event.senderFrame !== event.sender.mainFrame ||
            !this._options.isTrustedSender(event)
        )
            throw new Error('Untrusted remote-control sender.');
        const request = remoteNativeRequestSchema.parse(raw);
        let response: IRemoteNativeResponse;
        switch (request.kind) {
            case 'connections.list': {
                const connections = await this._options.runtime.listConnections();
                if (connections.some((profile) => profile.identity.appId !== this._options.appId))
                    throw new Error('Product profile namespace mismatch.');
                response = { kind: 'connections', connections };
                break;
            }
            case 'connections.close':
                await this._options.runtime.closeConnection(request.connectionId);
                response = { kind: 'done' };
                break;
            case 'connections.forget':
                await this._options.runtime.forgetConnection(request.connectionId);
                response = { kind: 'done' };
                break;
            case 'connections.open':
            case 'pairings.complete': {
                if (
                    request.kind === 'pairings.complete' &&
                    request.bootstrap.appId !== this._options.appId
                )
                    throw new Error('Pairing product namespace mismatch.');
                const raw =
                    request.kind === 'connections.open'
                        ? await this._options.runtime.openConnection(request.connectionId)
                        : await this._options.runtime.pair(request.bootstrap, request.deviceName);
                const activation = this.validateActivation(raw);
                if (
                    request.kind === 'connections.open'
                        ? activation.connectionId !== request.connectionId
                        : activation.identity.hostId !== request.bootstrap.hostId
                )
                    throw new Error('The activated connection does not match the selected host.');
                await this._options.activateView(activation, event);
                response = {
                    kind: 'view',
                    view: {
                        connectionId: activation.connectionId,
                        identity: activation.identity,
                        origin: activation.origin,
                    },
                };
                break;
            }
        }
        return remoteNativeResponseSchema.parse(response);
    }
    private validateActivation(raw: IRemoteElectronActivation): IRemoteElectronActivation {
        const view = remoteLocalViewSchema.parse({
            connectionId: raw.connectionId,
            identity: raw.identity,
            origin: raw.origin,
        });
        const url = new URL(view.origin),
            cookie = raw.cookie;
        if (
            view.identity.appId !== this._options.appId ||
            url.protocol !== 'http:' ||
            url.hostname !== '127.0.0.1' ||
            !url.port ||
            Number(url.port) < 1 ||
            url.origin !== view.origin ||
            Object.keys(raw).some(
                (key) => !['connectionId', 'identity', 'origin', 'cookie'].includes(key),
            )
        )
            throw new Error('A privileged view must be an exact owned HTTP loopback origin.');
        if (
            !cookie ||
            Object.keys(cookie).length !== 6 ||
            typeof cookie.name !== 'string' ||
            typeof cookie.value !== 'string' ||
            !/^[A-Za-z0-9_-]{1,120}$/u.test(cookie.name) ||
            !/^[A-Za-z0-9_-]{32,256}$/u.test(cookie.value) ||
            cookie.path !== '/' ||
            cookie.httpOnly !== true ||
            cookie.sameSite !== 'strict' ||
            cookie.secure !== false
        )
            throw new Error('Invalid private loopback capability.');
        return Object.freeze({
            ...view,
            cookie: Object.freeze({
                name: cookie.name,
                value: cookie.value,
                path: '/',
                httpOnly: true,
                sameSite: 'strict',
                secure: false,
            }),
        });
    }
    // #endregion
}
