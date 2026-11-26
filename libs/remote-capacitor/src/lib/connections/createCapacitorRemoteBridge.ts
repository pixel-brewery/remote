// #region Imports
import { registerPlugin } from '@capacitor/core';
import { createRemoteControlBridge } from '@pixel-brewery/remote-client';
import { remotePairingBootstrapSchema } from '@pixel-brewery/remote-protocol';
import type { IRemoteCapacitorBridge } from './interfaces/IRemoteCapacitorBridge.js';
import type { IRemoteCapacitorPlugin } from './interfaces/IRemoteCapacitorPlugin.js';
// #endregion

/**
 * Bind the native loopback gateway without globally patching fetch or XMLHttpRequest.
 * @param implementation - Optional injected plugin for deterministic tests or native host composition.
 * @returns Safe connection and scanning commands, with native credentials hidden.
 * @public
 */
export function createCapacitorRemoteBridge(
    implementation?: IRemoteCapacitorPlugin,
): IRemoteCapacitorBridge {
    const plugin = implementation ?? registerPlugin<IRemoteCapacitorPlugin>('PixelBreweryRemote');
    const control = createRemoteControlBridge(
        async (request) => (await plugin.invoke({ request })).response,
    );
    return Object.freeze({
        ...control,
        async scanPairing() {
            return remotePairingBootstrapSchema.parse((await plugin.scanPairing()).bootstrap);
        },
    });
}
