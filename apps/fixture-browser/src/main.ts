// #region Imports
import './registerFixtureElements.js';
import { Capacitor } from '@capacitor/core';
import { createCapacitorRemoteBridge } from '@pixel-brewery/remote-capacitor';
import {
    RemoteSession,
    type IRemoteControlBridge,
    type IRemoteSavedConnection,
} from '@pixel-brewery/remote-client';
import {
    BrowserPairingLocation,
    BrowserRemoteConnector,
    createBrowserClock,
    createBrowserOperationId,
    readRemoteServerEvents,
} from '@pixel-brewery/remote-browser';
import {
    remotePairingBootstrapSchema,
    remoteSavedConnectionSchema,
    type IRemotePairingBootstrap,
} from '@pixel-brewery/remote-protocol';
import './layout.css';
// #endregion

const control =
    (globalThis as typeof globalThis & { remote?: IRemoteControlBridge }).remote ??
    (Capacitor.isNativePlatform() ? createCapacitorRemoteBridge() : undefined);
const element = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const value = (id: string) => (element(id) as HTMLElement & { value: string }).value;
const status = (content: string) => {
    (element('status') as HTMLElement & { content: string }).content = content;
};
const evidence = (label: string, result: unknown) => {
    const output = element('evidence');
    output.textContent = `${label}: ${JSON.stringify(result)}\n${output.textContent ?? ''}`.slice(
        0,
        16_384,
    );
};
let session: RemoteSession | undefined,
    appId = '',
    currentHostId = '',
    streamController: AbortController | undefined,
    socket: WebSocket | undefined;
const locationPairing = new BrowserPairingLocation(location, history);
element('scan').hidden = !Capacitor.isNativePlatform();
for (const id of ['read', 'write', 'events', 'socket', 'range', 'upload', 'revoke'])
    (element(id) as HTMLElement & { disabled: boolean }).disabled = true;
const localKey = 'pixel-brewery.remote.fixture.profiles.v1';
function localProfiles(): readonly IRemoteSavedConnection[] {
    try {
        const input: unknown = JSON.parse(localStorage.getItem(localKey) ?? '[]');
        if (!Array.isArray(input) || input.length > 64) return [];
        return input.map((entry) => remoteSavedConnectionSchema.parse(entry));
    } catch {
        return [];
    }
}
function saveProfiles(profiles: readonly IRemoteSavedConnection[]): void {
    localStorage.setItem(localKey, JSON.stringify(profiles));
}
function invitation(raw: string): IRemotePairingBootstrap {
    const url = new URL(raw),
        params = new URLSearchParams(url.hash.slice(1));
    const one = (name: string) => {
        const values = params.getAll(name);
        if (values.length !== 1) throw new Error('Missing or repeated invitation field.');
        return values[0];
    };
    return remotePairingBootstrapSchema.parse({
        origin: url.origin,
        appId: one('app'),
        hostId: one('host'),
        challenge: one('pair'),
        expiresAt: one('expires'),
    });
}
function stop(): void {
    streamController?.abort();
    streamController = undefined;
    socket?.close();
    socket = undefined;
}
async function initialize(): Promise<void> {
    await refreshProfiles();
    if (control && location.hostname !== '127.0.0.1') {
        status('Select a saved host or paste its invitation.');
        return;
    }
    const controller = new AbortController(),
        connector = new BrowserRemoteConnector({
            origin: location.origin,
            fetch: window.fetch.bind(window),
        }),
        endpoint = { id: 'view', transportId: connector.id, origin: location.origin };
    const probe = await connector.connect(endpoint, controller.signal);
    const host = await probe.describe(controller.signal);
    await probe.dispose();
    appId = host.identity.appId;
    currentHostId = host.identity.hostId;
    const next = new RemoteSession({
        identity: host.identity,
        endpoint,
        connector,
        clock: createBrowserClock(window),
        createId: () => createBrowserOperationId(crypto),
    });
    session = next;
    next.subscribe((state) => {
        status(`Connection: ${state.kind}`);
        const ready = state.kind === 'ready',
            notes = appId.endsWith('.notes');
        for (const id of ['read', 'write', 'events', 'socket', 'range', 'upload', 'revoke'])
            (element(id) as HTMLElement & { disabled: boolean }).disabled =
                !ready || (notes && ['events', 'socket', 'range', 'upload'].includes(id));
        element('note').hidden = !notes;
    });
    await next.initialize();
    const bootstrap = locationPairing.read();
    if (bootstrap) {
        await next.pair(bootstrap, value('device'));
        if (next.state.kind === 'ready') locationPairing.clear();
    }
    if (!control && next.state.kind === 'ready') {
        const profile = remoteSavedConnectionSchema.parse({
            id: host.identity.appId + ':' + host.identity.hostId,
            identity: host.identity,
            label: host.name,
            endpoints: [{ ...endpoint, id: 'browser' }],
            selectedEndpointId: 'browser',
        });
        saveProfiles([...localProfiles().filter((item) => item.id !== profile.id), profile]);
        await refreshProfiles();
    }
}
async function refreshProfiles(): Promise<void> {
    const profiles = control ? await control.listConnections() : localProfiles(),
        container = element('connections');
    container.replaceChildren();
    for (const profile of profiles) {
        const fragment = element<HTMLTemplateElement>('connection-template').content.cloneNode(
            true,
        ) as DocumentFragment;
        (fragment.querySelector('[data-profile-label]') as HTMLElement & { text: string }).text =
            profile.label;
        const actions = {
            open: async () => {
                stop();
                await session?.dispose();
                if (control) await control.openConnection(profile.id);
                else
                    location.assign(
                        profile.endpoints.find(
                            (endpoint) => endpoint.id === profile.selectedEndpointId,
                        )!.origin,
                    );
            },
            close: async () => {
                if (control) await control.closeConnection(profile.id);
                else if (
                    profile.identity.appId === appId &&
                    profile.identity.hostId === currentHostId
                ) {
                    stop();
                    await session?.disconnect();
                    status('Connection closed.');
                }
            },
            forget: async () => {
                if (control) await control.forgetConnection(profile.id);
                else {
                    if (
                        profile.identity.appId === appId &&
                        profile.identity.hostId === currentHostId &&
                        session
                    ) {
                        stop();
                        if (session.state.kind !== 'ready' && session.state.kind !== 'revoked')
                            await session.retry();
                        if (session.state.kind === 'ready') await session.revoke();
                    }
                    saveProfiles(localProfiles().filter((item) => item.id !== profile.id));
                }
                await refreshProfiles();
            },
        };
        for (const operation of ['open', 'close', 'forget'] as const)
            fragment
                .querySelector(`[data-operation="${operation}"]`)!
                .addEventListener('click', () => {
                    void actions[operation]().catch(report);
                });
        container.append(fragment);
    }
}
async function pair(): Promise<void> {
    const bootstrap = invitation(value('invitation'));
    if (control) {
        await control.pair(bootstrap, value('device'));
        return;
    }
    if (bootstrap.origin !== location.origin) {
        location.assign(value('invitation'));
        return;
    }
    if (!session) await initialize();
    await session!.pair(bootstrap, value('device'));
    if (session!.state.kind === 'ready') {
        (element('invitation') as HTMLElement & { value: string }).value = '';
        locationPairing.clear();
        await session!.dispose();
        session = undefined;
        await initialize();
    }
}
async function bytes(
    method: string,
    path: string,
    body?: unknown,
    headers?: Readonly<Record<string, string>>,
): Promise<Uint8Array> {
    if (!session) throw new Error('Open a connection first.');
    const response = await session.request({
        method,
        path,
        ...(headers ? { headers } : {}),
        ...(body === undefined
            ? {}
            : {
                  headers: { 'content-type': 'application/json' },
                  body: (async function* () {
                      yield new TextEncoder().encode(JSON.stringify(body));
                  })(),
              }),
    });
    const chunks: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of response.body) {
        size += chunk.length;
        if (size > 65_536) {
            await response.cancel();
            throw new Error('Fixture evidence response is too large.');
        }
        chunks.push(chunk);
    }
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }
    evidence(`${method} ${path} HTTP ${response.status}`, new TextDecoder().decode(result));
    return result;
}
function report(error: unknown): void {
    if (
        error instanceof Error &&
        (error.name === 'AbortError' || ('code' in error && error.code === 'CONNECTION_CLOSED'))
    )
        return;
    status(error instanceof Error ? error.message : 'The operation failed.');
}
function action(id: string, run: () => Promise<unknown> | void): void {
    element(id).addEventListener('click', () => {
        void Promise.resolve().then(run).catch(report);
    });
}
action('pair', pair);
action('refresh', refreshProfiles);
action('scan', async () => {
    if (!Capacitor.isNativePlatform())
        throw new Error('Paste the invitation URL in a browser or desktop client.');
    const bootstrap = await createCapacitorRemoteBridge().scanPairing();
    await control!.pair(bootstrap, value('device'));
});
action('read', () => bytes('GET', appId.endsWith('.notes') ? '/api/notes' : '/api/counter'));
action('write', () =>
    bytes(
        'POST',
        appId.endsWith('.notes') ? '/api/notes' : '/api/counter',
        appId.endsWith('.notes') ? { text: value('note') } : { delta: 1 },
    ),
);
action('events', async () => {
    if (appId.endsWith('.notes'))
        throw new Error(
            'The notes fixture exposes request operations. Counter exposes streaming operations.',
        );
    stop();
    streamController = new AbortController();
    const response = await session!.request({
        method: 'GET',
        path: '/api/events',
        signal: streamController.signal,
    });
    for await (const event of readRemoteServerEvents(response.body))
        evidence(`SSE ${event.type}`, event.data);
});
action('socket', () => {
    if (appId.endsWith('.notes'))
        throw new Error('Select the counter fixture for WebSocket evidence.');
    socket?.close();
    socket = new WebSocket(location.origin.replace(/^http/u, 'ws') + '/api/socket');
    socket.onopen = () =>
        socket!.send(JSON.stringify({ kind: 'echo', value: 'Remote fixture echo' }));
    socket.onmessage = (event: MessageEvent<unknown>) => evidence('WebSocket', event.data);
});
action('upload', async () => {
    const data = new FormData();
    data.set(
        'file',
        new File([new Uint8Array(262_144)], 'remote-fixture.bin', {
            type: 'application/octet-stream',
        }),
    );
    const response = await fetch('/api/upload', {
        method: 'POST',
        credentials: 'same-origin',
        redirect: 'error',
        body: data,
    });
    evidence(`FormData upload HTTP ${response.status}`, await response.json());
});
action('range', async () => {
    const result = await bytes('GET', '/api/media', undefined, { Range: 'bytes=4-11' });
    evidence('Range byte count', result.length);
});
action('stop', stop);
action('revoke', async () => {
    stop();
    await session?.revoke();
});
window.addEventListener(
    'pagehide',
    () => {
        stop();
        void session?.dispose();
    },
    { once: true },
);
void initialize().catch(report);
