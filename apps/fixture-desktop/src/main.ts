// #region Imports
import { app, BrowserWindow, ipcMain, safeStorage, utilityProcess } from 'electron';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
    ElectronCredentialVault,
    ElectronRemoteController,
    type IRemoteElectronRuntime,
    type IRemoteElectronActivation,
} from '@pixel-brewery/remote-electron/main';
import {
    remoteHostIdentitySchema,
    remoteNativeRequestSchema,
    type IRemoteNativeRequest,
    type IRemotePairingBootstrap,
    type IRemoteSavedConnection,
} from '@pixel-brewery/remote-protocol';
// #endregion

const product = process.argv.includes('--notes') ? 'notes' : 'counter',
    appId = `remote.fixture.${product}`;
const folder = dirname(fileURLToPath(import.meta.url)),
    assets = resolve(folder, '../../fixture-browser/dist');
const fixtureData = process.argv
    .find((argument) => argument.startsWith('--fixture-data='))
    ?.slice('--fixture-data='.length);
if (fixtureData) app.setPath('userData', resolve(fixtureData));
// Playwright's loader defaults to mock storage; this fixture explicitly verifies the real OS vault.
if (process.argv.includes('--e2e')) {
    app.commandLine.removeSwitch('use-mock-keychain');
    app.commandLine.removeSwitch('password-store');
    if (process.platform === 'linux')
        app.commandLine.appendSwitch('password-store', 'gnome-libsecret');
}
async function bootstrap(): Promise<void> {
    await app.whenReady();
    const vault = new ElectronCredentialVault(
        resolve(app.getPath('userData'), `remote-${product}`, 'credentials.json'),
        safeStorage,
    );
    const network = utilityProcess.fork(resolve(folder, 'utility.js'), [], {
        serviceName: 'Remote fixture network',
    });
    const pending = new Map<
        string,
        { resolve: (value: unknown) => void; reject: (error: Error) => void; cancel: () => void }
    >();
    let completeInitialization: () => void = () => undefined,
        failInitialization: (error: Error) => void = () => undefined;
    const initialized = new Promise<void>((done, reject) => {
        completeInitialization = done;
        failInitialization = reject;
    });
    const initializationTimer = setTimeout(
        () => failInitialization(new Error('Remote Utility initialization timed out.')),
        10_000,
    );
    void initialized.finally(() => clearTimeout(initializationTimer)).catch(() => undefined);
    let trustedOrigin: string | undefined, activeConnectionId: string | undefined;
    const window = new BrowserWindow({
        show: !process.argv.includes('--e2e'),
        width: 1100,
        height: 850,
        webPreferences: {
            preload: resolve(folder, 'preload.cjs'),
            sandbox: true,
            contextIsolation: true,
            nodeIntegration: false,
            webSecurity: true,
        },
    });
    function allowed(url: string): boolean {
        const parsed = new URL(url);
        if (parsed.protocol === 'file:') return fileURLToPath(parsed).startsWith(assets + '/');
        return parsed.origin.replace(/^ws/u, 'http') === trustedOrigin;
    }
    window.webContents.session.webRequest.onBeforeRequest((details, callback) =>
        callback({ cancel: !allowed(details.url) }),
    );
    window.webContents.on('will-navigate', (event) => {
        if (!allowed(event.url)) event.preventDefault();
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    async function rpc(request: IRemoteNativeRequest): Promise<unknown> {
        await initialized;
        const parsed = remoteNativeRequestSchema.parse(request),
            id = randomUUID();
        if (pending.size >= 64) return Promise.reject(new Error('Remote control queue exhausted.'));
        return new Promise((done, reject) => {
            const timer = setTimeout(() => {
                pending.delete(id);
                reject(
                    new Error(
                        'The Utility operation did not complete; reconcile before retrying a mutation.',
                    ),
                );
            }, 30_000);
            pending.set(id, { resolve: done, reject, cancel: () => clearTimeout(timer) });
            network.postMessage({ kind: 'control', id, request: parsed });
        });
    }
    const runtime: IRemoteElectronRuntime = {
        listConnections: async () =>
            (
                (await rpc({ kind: 'connections.list' })) as {
                    connections: readonly IRemoteSavedConnection[];
                }
            ).connections,
        pair: async (bootstrap: IRemotePairingBootstrap, deviceName: string) =>
            rpc({
                kind: 'pairings.complete',
                bootstrap,
                deviceName,
            }) as Promise<IRemoteElectronActivation>,
        openConnection: async (connectionId: string) =>
            rpc({ kind: 'connections.open', connectionId }) as Promise<IRemoteElectronActivation>,
        closeConnection: async (connectionId: string) => {
            await rpc({ kind: 'connections.close', connectionId });
            if (activeConnectionId === connectionId) {
                trustedOrigin = undefined;
                activeConnectionId = undefined;
                await window.loadFile(resolve(assets, 'index.html'));
            }
        },
        forgetConnection: async (connectionId: string) => {
            await rpc({ kind: 'connections.forget', connectionId });
            if (activeConnectionId === connectionId) {
                trustedOrigin = undefined;
                activeConnectionId = undefined;
                await window.loadFile(resolve(assets, 'index.html'));
            }
        },
    };
    const controller = new ElectronRemoteController({
        appId,
        runtime,
        isTrustedSender: (event) =>
            event.sender.id === window.webContents.id && allowed(event.senderFrame!.url),
        activateView: async (activation) => {
            trustedOrigin = activation.origin;
            activeConnectionId = activation.connectionId;
            await window.webContents.session.cookies.set({
                url: activation.origin,
                name: activation.cookie.name,
                value: activation.cookie.value,
                path: '/',
                httpOnly: true,
                sameSite: 'strict',
                secure: false,
            });
            await window.loadURL(activation.origin);
        },
    });
    ipcMain.handle('remote-fixture:control', (event, request: unknown) =>
        controller.handle(event, request),
    );
    network.on('message', (raw: unknown) => {
        if (!raw || typeof raw !== 'object') return;
        const message = raw as Record<string, unknown>;
        if (message['kind'] === 'ready') {
            network.postMessage({
                kind: 'initialize',
                product,
                assetsPath: assets,
                storagePath: resolve(app.getPath('userData'), `remote-${product}`, 'profiles.json'),
                allowLoopbackForTests: process.argv.includes('--test-loopback'),
            });
            return;
        }
        if (message['kind'] === 'initialized') {
            completeInitialization();
            return;
        }
        if (message['kind'] === 'reply' && typeof message['id'] === 'string') {
            const entry = pending.get(message['id']);
            if (!entry) return;
            pending.delete(message['id']);
            entry.cancel();
            if (typeof message['error'] === 'string') entry.reject(new Error(message['error']));
            else entry.resolve(message['value']);
            return;
        }
        if (
            message['kind'] === 'credential' &&
            typeof message['id'] === 'string' &&
            ['get', 'set', 'delete'].includes(String(message['operation']))
        ) {
            void (async () => {
                const identity = remoteHostIdentitySchema.parse(message['identity']);
                if (identity.appId !== appId) throw new Error('Credential product mismatch.');
                const operation = message['operation'];
                let value: unknown;
                if (operation === 'get') value = await vault.get(identity);
                else if (operation === 'delete') await vault.delete(identity);
                else {
                    if (typeof message['credential'] !== 'string')
                        throw new Error('Missing credential.');
                    await vault.set(identity, message['credential']);
                }
                network.postMessage({ kind: 'credential.reply', id: message['id'], value });
            })().catch(() =>
                network.postMessage({
                    kind: 'credential.reply',
                    id: message['id'],
                    error: 'Protected credential operation failed.',
                }),
            );
        }
    });
    network.on('exit', () => {
        failInitialization(new Error('The Remote Utility process stopped.'));
        for (const entry of pending.values()) {
            entry.cancel();
            entry.reject(new Error('The Remote Utility process stopped.'));
        }
        pending.clear();
    });
    await window.loadFile(resolve(assets, 'index.html'));
    window.on('closed', () => {
        network.postMessage({ kind: 'dispose' });
        network.kill();
        app.quit();
    });
}
// Let Electron finish ESM evaluation before app readiness (also required by Playwright's loader).
void bootstrap().catch((error: unknown) => {
    process.stderr.write(
        (error instanceof Error ? error.message : 'The Remote desktop fixture failed to start.') +
            '\n',
    );
    app.exit(1);
});
