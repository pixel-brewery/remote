// #region Imports
import {
    remoteNativeRequestSchema,
    remoteNativeResponseSchema,
    type IRemoteNativeRequest,
    type IRemotePairingBootstrap,
} from '@pixel-brewery/remote-protocol';
import type { IRemoteControlBridge } from './interfaces/IRemoteControlBridge.js';
// #endregion

/**
 * Build a frozen safe API around the application's existing fixed IPC channel.
 * @param invoke - Privileged runtime invocation closure; this function is never exposed to the renderer.
 * @returns Validated connection operations containing no credential or arbitrary request method.
 * @public
 */
export function createRemoteControlBridge(
    invoke: (request: IRemoteNativeRequest) => Promise<unknown>,
): IRemoteControlBridge {
    const call = async (request: IRemoteNativeRequest) =>
        remoteNativeResponseSchema.parse(await invoke(remoteNativeRequestSchema.parse(request)));
    const view = async (request: IRemoteNativeRequest) => {
        const response = await call(request);
        if (response.kind !== 'view') throw new Error('Unexpected remote control response.');
        return response.view;
    };
    return Object.freeze({
        async listConnections() {
            const response = await call({ kind: 'connections.list' });
            if (response.kind !== 'connections')
                throw new Error('Unexpected connection list response.');
            return response.connections;
        },
        pair: (bootstrap: IRemotePairingBootstrap, deviceName: string) =>
            view({ kind: 'pairings.complete', bootstrap, deviceName }),
        openConnection: (connectionId: string) => view({ kind: 'connections.open', connectionId }),
        async closeConnection(connectionId: string) {
            const response = await call({ kind: 'connections.close', connectionId });
            if (response.kind !== 'done') throw new Error('Unexpected close response.');
        },
        async forgetConnection(connectionId: string) {
            const response = await call({ kind: 'connections.forget', connectionId });
            if (response.kind !== 'done') throw new Error('Unexpected forget response.');
        },
    });
}
