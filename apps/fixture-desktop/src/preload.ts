// #region Imports
import { contextBridge, ipcRenderer } from 'electron';
import { createRemotePreloadBridge } from '@pixel-brewery/remote-electron/preload';
// #endregion

contextBridge.exposeInMainWorld(
    'remote',
    createRemotePreloadBridge(
        (request) => ipcRenderer.invoke('remote-fixture:control', request) as Promise<unknown>,
    ),
);
