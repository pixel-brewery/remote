// #region Imports
import { randomUUID } from 'node:crypto';
import { isAbsolute, join } from 'node:path';
import type { IRemoteCredentialStore } from '@pixel-brewery/remote-client';
import {
    remoteContentPolicySchema,
    remoteHostIdentitySchema,
    remoteNativeRequestSchema,
    type IRemoteHostIdentity,
} from '@pixel-brewery/remote-protocol';
import { JsonRemoteProfileStore } from '../profiles/JsonRemoteProfileStore.js';
import { ElectronRemoteUtility } from '../transport/ElectronRemoteUtility.js';
import type { IElectronRemoteControlMessage } from './interfaces/IElectronRemoteControlMessage.js';
import type { IElectronRemoteInitializeMessage } from './interfaces/IElectronRemoteInitializeMessage.js';
import type { IElectronRemoteParentPort } from './interfaces/IElectronRemoteParentPort.js';
import type { IElectronRemoteUtilityProcessOptions } from './interfaces/IElectronRemoteUtilityProcessOptions.js';
import { readElectronRemoteParentMessage } from './readElectronRemoteParentMessage.js';
// #endregion

const startedPorts = new WeakSet<IElectronRemoteParentPort>();

/**
 * Run the application's remote connection owner inside its Electron Utility Process.
 *
 * @remarks Call once from the bundled Utility entry that `ElectronRemoteDesktop` forks. The
 * function listens on `process.parentPort` and announces `ready`; Main then sends one
 * initialization with the absolute asset and storage paths. Initialization cross-checks the
 * application namespace, loads the routes through `loadRoutes`, validates the content policy with
 * its canonical schema and composes an `ElectronRemoteUtility` whose credential store is a bounded
 * request channel to Main's OS vault. Only the canonical list, pair, open, close and forget
 * controls are dispatched; every message is validated before use and each control receives one
 * correlated reply. The Main/Utility message protocol is internal to this package. A `dispose`
 * message rejects pending credential requests, closes every owned socket and answers `disposed`;
 * Main owns the startup deadline and the bounded shutdown fallback.
 * @param options - Application namespace, route loader and optional content policy, profile store
 * factory and credential timeout.
 * @throws Error outside an Electron Utility Process, for a non-canonical namespace or timeout, or
 * when the runtime was already started on this parent port.
 * @public
 */
export function startElectronRemoteUtility(options: IElectronRemoteUtilityProcessOptions): void {
    const port = (process as NodeJS.Process & { parentPort?: IElectronRemoteParentPort })
        .parentPort;
    if (!port) throw new Error('The Remote runtime requires an Electron Utility Process.');
    if (startedPorts.has(port)) throw new Error('The Remote Utility runtime is already started.');
    if (!remoteHostIdentitySchema.safeParse({ appId: options.appId, hostId: 'utility' }).success)
        throw new Error('The Remote Utility runtime requires a canonical application namespace.');
    const credentialTimeoutMs = options.credentialTimeoutMs ?? 15_000;
    if (
        !Number.isInteger(credentialTimeoutMs) ||
        credentialTimeoutMs < 1 ||
        credentialTimeoutMs > 2_147_483_647
    )
        throw new Error('The credential timeout must be positive integer milliseconds.');
    startedPorts.add(port);
    let state: 'waiting' | 'initializing' | 'ready' | 'failed' | 'disposing' | 'disposed' =
        'waiting';
    let runtime: ElectronRemoteUtility | undefined;
    const credentials = new Map<
        string,
        {
            readonly resolve: (value: string | null | undefined) => void;
            readonly reject: (error: Error) => void;
            readonly cancel: () => void;
        }
    >();
    const credential = (
        operation: 'get' | 'set' | 'delete',
        identity: IRemoteHostIdentity,
        value?: string,
    ): Promise<string | null | undefined> => {
        if (state === 'disposing' || state === 'disposed')
            return Promise.reject(new Error('The Remote Utility runtime is disposed.'));
        if (credentials.size >= 64)
            return Promise.reject(new Error('Remote credential mediation is busy.'));
        const id = randomUUID();
        return new Promise((resolveCredential, reject) => {
            const timer = setTimeout(() => {
                credentials.delete(id);
                reject(new Error('Protected remote credential mediation did not complete.'));
            }, credentialTimeoutMs);
            credentials.set(id, {
                resolve: resolveCredential,
                reject,
                cancel: () => clearTimeout(timer),
            });
            port.postMessage({
                kind: 'credential',
                id,
                operation,
                identity,
                ...(value === undefined ? {} : { credential: value }),
            });
        });
    };
    const credentialStore: IRemoteCredentialStore = {
        get: async (identity) => {
            const value = await credential('get', identity);
            if (value !== null && typeof value !== 'string')
                throw new Error('Invalid protected credential response.');
            return value;
        },
        set: async (identity, value) => {
            await credential('set', identity, value);
        },
        delete: async (identity) => {
            await credential('delete', identity);
        },
    };
    const initialize = async (message: IElectronRemoteInitializeMessage): Promise<void> => {
        if (state !== 'waiting') return;
        state = 'initializing';
        try {
            if (
                message.appId !== options.appId ||
                !isAbsolute(message.assetsPath) ||
                !isAbsolute(message.storageDirectory)
            )
                throw new Error('Main announced another application or a relative path.');
            const routes = await options.loadRoutes(message.assetsPath);
            if (
                !Array.isArray(routes) ||
                routes.length > 1024 ||
                routes.some((route) => !route || typeof route !== 'object')
            )
                throw new Error('The application route inventory is malformed.');
            const contentPolicy =
                options.contentPolicy === undefined
                    ? undefined
                    : remoteContentPolicySchema.parse(options.contentPolicy);
            const profileStore =
                options.createProfileStore?.(message.storageDirectory) ??
                new JsonRemoteProfileStore(
                    join(message.storageDirectory, 'profiles.json'),
                    options.appId,
                );
            if (state !== 'initializing') return;
            runtime = new ElectronRemoteUtility({
                appId: options.appId,
                assetsPath: message.assetsPath,
                routes,
                profileStore,
                credentialStore,
                allowLoopbackForTests: message.allowLoopbackForTests,
                ...(contentPolicy === undefined ? {} : { contentPolicy }),
            });
            state = 'ready';
            port.postMessage({ kind: 'initialized' });
        } catch (error) {
            if (state !== 'initializing') return;
            state = 'failed';
            process.stderr.write(`Remote Utility initialization failed: ${describe(error)}\n`);
            port.postMessage({ kind: 'initialization.failed' });
        }
    };
    const control = async (message: IElectronRemoteControlMessage): Promise<void> => {
        try {
            const current = runtime;
            if (!current || state !== 'ready')
                throw new Error('The Remote Utility runtime is not ready.');
            const parsed = remoteNativeRequestSchema.safeParse(message.request);
            if (!parsed.success) throw new Error('Invalid Remote control request.');
            const request = parsed.data;
            let value: unknown = null;
            switch (request.kind) {
                case 'connections.list':
                    value = { connections: await current.listConnections() };
                    break;
                case 'pairings.complete':
                    value = await current.pair(request.bootstrap, request.deviceName);
                    break;
                case 'connections.open':
                    value = await current.openConnection(request.connectionId);
                    break;
                case 'connections.close':
                    await current.closeConnection(request.connectionId);
                    break;
                case 'connections.forget':
                    await current.forgetConnection(request.connectionId);
                    break;
            }
            port.postMessage({ kind: 'reply', id: message.id, value });
        } catch (error) {
            port.postMessage({ kind: 'reply', id: message.id, error: describe(error) });
        }
    };
    const dispose = async (): Promise<void> => {
        if (state === 'disposing' || state === 'disposed') return;
        state = 'disposing';
        // Queued operations may wait for Main's vault, which stops answering during shutdown.
        for (const pending of credentials.values()) {
            pending.cancel();
            pending.reject(new Error('The Remote Utility runtime is disposed.'));
        }
        credentials.clear();
        try {
            await runtime?.dispose();
        } catch {
            // Owned resources are released best effort; Main kills the process afterwards.
        } finally {
            state = 'disposed';
            port.postMessage({ kind: 'disposed' });
        }
    };
    port.on('message', ({ data }) => {
        const message = readElectronRemoteParentMessage(data);
        if (!message) return;
        if (message.kind === 'credential.reply') {
            const pending = credentials.get(message.id);
            if (!pending) return;
            credentials.delete(message.id);
            pending.cancel();
            if (message.error)
                pending.reject(new Error('Protected remote credential operation failed.'));
            else pending.resolve(message.value);
        } else if (message.kind === 'initialize') void initialize(message);
        else if (message.kind === 'control') void control(message);
        else if (message.kind === 'dispose') void dispose();
    });
    port.postMessage({ kind: 'ready' });
}

function describe(error: unknown): string {
    const text =
        error instanceof Error && error.message ? error.message : 'The Remote operation failed.';
    return text.replace(/[\u0000-\u001f\u007f]+/gu, ' ').slice(0, 512);
}
