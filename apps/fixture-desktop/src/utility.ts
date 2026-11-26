// #region Imports
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { ElectronRemoteUtility } from '@pixel-brewery/remote-electron/utility';
import { fixtureCounterRoutes, fixtureNotesRoutes } from '@pixel-brewery/remote-fixture-host';
import {
    remoteNativeRequestSchema,
    remoteSavedConnectionSchema,
    type IRemoteHostIdentity,
} from '@pixel-brewery/remote-protocol';
// #endregion

const port = (
    process as typeof process & {
        parentPort?: {
            on(event: string, listener: (event: { data: unknown }) => void): void;
            postMessage(value: unknown): void;
        };
    }
).parentPort;
if (!port) throw new Error('The Remote runtime requires an Electron Utility process.');
let runtime: ElectronRemoteUtility | undefined;
const credentials = new Map<
    string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void; cancel: () => void }
>();
function credential(
    operation: 'get' | 'set' | 'delete',
    identity: IRemoteHostIdentity,
    value?: string,
): Promise<unknown> {
    const id = randomUUID();
    return new Promise((done, reject) => {
        const timer = setTimeout(() => {
            credentials.delete(id);
            reject(new Error('Main credential mediation timed out.'));
        }, 10_000);
        credentials.set(id, { resolve: done, reject, cancel: () => clearTimeout(timer) });
        port!.postMessage({
            kind: 'credential',
            id,
            operation,
            identity,
            ...(value === undefined ? {} : { credential: value }),
        });
    });
}
port.on('message', ({ data: raw }) => {
    if (!raw || typeof raw !== 'object') return;
    const message = raw as Record<string, unknown>;
    if (message['kind'] === 'credential.reply' && typeof message['id'] === 'string') {
        const pending = credentials.get(message['id']);
        if (!pending) return;
        credentials.delete(message['id']);
        pending.cancel();
        if (typeof message['error'] === 'string') pending.reject(new Error(message['error']));
        else pending.resolve(message['value']);
        return;
    }
    if (message['kind'] === 'initialize') {
        if (
            runtime ||
            !['counter', 'notes'].includes(String(message['product'])) ||
            typeof message['assetsPath'] !== 'string' ||
            typeof message['storagePath'] !== 'string'
        )
            return;
        const filename = message['storagePath'];
        runtime = new ElectronRemoteUtility({
            appId: 'remote.fixture.' + message['product'],
            assetsPath: message['assetsPath'],
            routes: message['product'] === 'counter' ? fixtureCounterRoutes : fixtureNotesRoutes,
            allowLoopbackForTests: message['allowLoopbackForTests'] === true,
            profileStore: {
                load: async () => {
                    try {
                        const value: unknown = JSON.parse(await readFile(filename, 'utf8'));
                        if (!Array.isArray(value) || value.length > 64)
                            throw new Error('Malformed profiles.');
                        return value.map((profile) => remoteSavedConnectionSchema.parse(profile));
                    } catch (error) {
                        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
                        throw error;
                    }
                },
                save: async (profiles) => {
                    await mkdir(dirname(filename), { recursive: true, mode: 0o700 });
                    const temporary = filename + '.' + randomUUID() + '.tmp';
                    await writeFile(temporary, JSON.stringify(profiles), {
                        mode: 0o600,
                        flag: 'wx',
                    });
                    await rename(temporary, filename);
                },
            },
            credentialStore: {
                get: async (identity) => {
                    const value = await credential('get', identity);
                    if (value !== null && typeof value !== 'string')
                        throw new Error('Malformed credential response.');
                    return value;
                },
                set: async (identity, value) => {
                    await credential('set', identity, value);
                },
                delete: async (identity) => {
                    await credential('delete', identity);
                },
            },
        });
        port!.postMessage({ kind: 'initialized' });
        return;
    }
    if (message['kind'] === 'dispose') {
        void runtime?.dispose();
        return;
    }
    if (message['kind'] !== 'control' || typeof message['id'] !== 'string') return;
    void (async () => {
        if (!runtime) throw new Error('The Remote Utility is not initialized.');
        const request = remoteNativeRequestSchema.parse(message['request']);
        switch (request.kind) {
            case 'connections.list':
                return { connections: await runtime.listConnections() };
            case 'pairings.complete':
                return runtime.pair(request.bootstrap, request.deviceName);
            case 'connections.open':
                return runtime.openConnection(request.connectionId);
            case 'connections.close':
                await runtime.closeConnection(request.connectionId);
                return null;
            case 'connections.forget':
                await runtime.forgetConnection(request.connectionId);
                return null;
        }
    })().then(
        (value) => port!.postMessage({ kind: 'reply', id: message['id'], value }),
        (error: unknown) =>
            port!.postMessage({
                kind: 'reply',
                id: message['id'],
                error: error instanceof Error ? error.message : 'The Remote operation failed.',
            }),
    );
});

port.postMessage({ kind: 'ready' });
