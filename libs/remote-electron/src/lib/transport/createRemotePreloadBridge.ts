// #region Imports
import { createRemoteControlBridge } from '@pixel-brewery/remote-client';
import type { IRemoteNativeRequest } from '@pixel-brewery/remote-protocol';
import type { IRemotePreloadBridge } from './interfaces/IRemotePreloadBridge.js';
// #endregion

/**
 * Build a frozen renderer API for one fixed preload IPC channel.
 * @param invoke - Preload-owned invocation closure; never expose this generic closure to the renderer.
 * @returns Narrow validated connection controls without credentials or arbitrary URL dispatch.
 * @public
 */
export function createRemotePreloadBridge(
    invoke: (request: IRemoteNativeRequest) => Promise<unknown>,
): IRemotePreloadBridge {
    return createRemoteControlBridge(invoke);
}
