// #region Imports
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { WebSocket } from 'ws';
import { RemoteAccessService } from '@pixel-brewery/remote-core';
import type { IRemoteContentPolicy, IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
import { remoteRoutes } from '@pixel-brewery/remote-protocol';
import { NodeRemoteHost } from '../host/NodeRemoteHost.js';
import { NodeRemoteSecurity } from '../security/NodeRemoteSecurity.js';
import { NodeRemoteConnector } from '../client/NodeRemoteConnector.js';
import { NodeLocalGateway } from './NodeLocalGateway.js';
// #endregion

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
    for (const dispose of cleanup.splice(0).reverse()) await dispose();
});
const identity = { appId: 'test.gateway', hostId: 'host-one' };
const routes: readonly IRemoteRouteDefinition[] = [
    {
        id: 'value',
        method: 'GET',
        path: '/api/value',
        kind: 'http',
        capabilities: ['read'],
        retry: 'safe-read',
    },
    {
        id: 'events',
        method: 'GET',
        path: '/api/events',
        kind: 'sse',
        capabilities: ['read'],
        retry: 'safe-read',
    },
    {
        id: 'socket',
        method: 'GET',
        path: '/api/socket',
        kind: 'websocket',
        capabilities: ['read'],
        retry: 'never',
    },
    {
        id: 'executable',
        method: 'GET',
        path: '/api/remote-script',
        kind: 'http',
        capabilities: ['read'],
        retry: 'safe-read',
    },
];

async function fixture(
    maxConcurrentRequests = 64,
    closeUpstreamBeforeUpgrade = false,
    contentPolicy?: IRemoteContentPolicy,
) {
    const root = await mkdtemp(join(tmpdir(), 'remote-view-'));
    cleanup.push(() => rm(root, { recursive: true, force: true }));
    await writeFile(
        join(root, 'index.html'),
        '<!doctype html><html><body>Trusted packaged fixture</body></html>',
    );
    let state: unknown = null;
    let token: string | null = null;
    let requests = 0;
    let cancelled = 0;
    const access = new RemoteAccessService({
        identity,
        store: {
            load: async () => state,
            save: async (value) => {
                state = structuredClone(value);
            },
        },
        security: new NodeRemoteSecurity(),
        clock: { now: () => Date.now() },
        capabilities: ['read'],
    });
    const host = new NodeRemoteHost({
        identity,
        name: 'Gateway fixture',
        access,
        routes,
        host: '127.0.0.1',
        port: 0,
        allowLoopbackForTests: true,
        application: {
            handle: async (_request, response, context) => {
                requests++;
                if (context.operationId === 'events') {
                    response.writeHead(200, { 'Content-Type': 'text/event-stream' });
                    response.write('data: first\n\n');
                    context.signal.addEventListener(
                        'abort',
                        () => {
                            cancelled++;
                        },
                        { once: true },
                    );
                    return;
                }
                if (context.operationId === 'executable') {
                    response
                        .writeHead(200, { 'Content-Type': 'text/javascript' })
                        .end('globalThis.remoteExecuted = true');
                    return;
                }
                response
                    .writeHead(200, {
                        'Content-Type': 'application/json',
                        'Set-Cookie': 'remote-private=must-not-escape',
                    })
                    .end('{"value":7}');
            },
            webSocket: async (socket) => {
                socket.on('message', (data, binary) => socket.send(data, { binary }));
            },
        },
    });
    cleanup.push(() => host.dispose());
    await host.enable();
    const connector = new NodeRemoteConnector({
        expectedIdentity: identity,
        routes,
        allowLoopbackForTests: true,
        credentialStore: {
            get: async () => token,
            set: async (_identity, value) => {
                token = value;
            },
            delete: async () => {
                token = null;
            },
        },
    });
    const transport = await connector.connect(
        host.descriptor.endpoints[0]!,
        new AbortController().signal,
    );
    cleanup.push(() => transport.dispose());
    await transport.pair(
        await host.createPairing(),
        'Native view',
        'attempt-1234567890',
        new AbortController().signal,
    );
    const gateway = new NodeLocalGateway({
        identity,
        connectionId: 'connection-one',
        routes,
        transport,
        assetsPath: root,
        maxConcurrentRequests,
        ...(contentPolicy === undefined ? {} : { contentPolicy }),
        openWebSocket: async (path, signal) => {
            const remote = await transport.openWebSocket(path, signal);
            if (closeUpstreamBeforeUpgrade)
                await new Promise<void>((complete) => {
                    remote.once('close', () => complete());
                    remote.terminate();
                });
            return remote;
        },
    });
    cleanup.push(() => gateway.dispose());
    const view = await gateway.start();
    const cookie = view.cookie.name + '=' + view.cookie.value;
    return {
        host,
        access,
        gateway,
        view,
        cookie,
        requests: () => requests,
        cancelled: () => cancelled,
        token: () => token,
    };
}

describe('NodeLocalGateway', () => {
    it.each([
        ['allowHttpsImages', 'img-src'],
        ['allowHttpsMedia', 'media-src'],
        ['allowHttpsConnections', 'connect-src'],
    ] as const)(
        'adds HTTPS only to the explicitly enabled %s packaged-content directive',
        async (flag, directive) => {
            // Arrange
            const value = await fixture(64, false, { [flag]: true });
            // Act
            const response = await fetch(value.view.origin + '/', {
                headers: { cookie: value.cookie },
            });
            const directives = response.headers
                .get('content-security-policy')!
                .split(';')
                .map((part) => part.trim());
            await response.arrayBuffer();
            const executable = await fetch(value.view.origin + '/api/remote-script', {
                headers: { cookie: value.cookie },
            });
            // Assert
            for (const name of ['img-src', 'media-src', 'connect-src']) {
                expect(
                    directives.find((part) => part.startsWith(name + ' '))!.includes('https:'),
                ).toBe(name === directive);
            }
            expect(directives).toContain("script-src 'self'");
            expect(directives).toContain("default-src 'self'");
            expect(directives).toContain("frame-ancestors 'none'");
            expect(executable.status).toBe(403);
            await executable.arrayBuffer();
        },
    );

    it('denies executable fetch destinations before proxying while retaining packaged document delivery', async () => {
        // Arrange
        const value = await fixture();
        // Act
        const statuses: number[] = [];
        for (const destination of ['script', 'document', 'iframe', 'worker', 'style', 'object']) {
            statuses.push(
                await new Promise<number>((complete, reject) => {
                    const request = httpRequest(
                        value.view.origin + '/api/value',
                        { headers: { cookie: value.cookie, 'sec-fetch-dest': destination } },
                        (response) => {
                            response.resume();
                            complete(response.statusCode!);
                        },
                    );
                    request.on('error', reject);
                    request.end();
                }),
            );
        }
        const asset = await fetch(value.view.origin + '/', {
            headers: { cookie: value.cookie, 'sec-fetch-dest': 'document' },
        });
        // Assert
        expect(statuses).toEqual([403, 403, 403, 403, 403, 403]);
        expect(value.requests()).toBe(0);
        expect(await asset.text()).toContain('Trusted packaged fixture');
        const assetPolicy = asset.headers
            .get('content-security-policy')!
            .split(';')
            .map((part) => part.trim());
        expect(assetPolicy).toContain("style-src 'self' 'unsafe-inline'");
        expect(assetPolicy).toContain("script-src 'self'");
        expect(assetPolicy.find((part) => part.startsWith('img-src '))).not.toContain('https:');
        expect(assetPolicy.find((part) => part.startsWith('media-src '))).not.toContain('https:');
        expect(assetPolicy.find((part) => part.startsWith('connect-src '))).not.toContain('https:');
        expect(assetPolicy).not.toContain("script-src 'self' 'unsafe-inline'");
        const product = await fetch(value.view.origin + '/api/value', {
            headers: { cookie: value.cookie },
        });
        expect(product.headers.get('content-security-policy')).toBe(
            "sandbox; default-src 'none'; frame-ancestors 'none'",
        );
        expect(product.headers.get('x-content-type-options')).toBe('nosniff');
        await product.arrayBuffer();
    });
    it('protects trusted packaged assets with a distinct local cookie and forwards only registered paths from its own origin', async () => {
        // Arrange
        const value = await fixture();
        // Act
        const anonymous = await fetch(value.view.origin + '/');
        const asset = await fetch(value.view.origin + '/', { headers: { cookie: value.cookie } });
        const json = await fetch(value.view.origin + '/api/value', {
            headers: { cookie: value.cookie },
        });
        const descriptor = await fetch(value.view.origin + remoteRoutes.host, {
            headers: { cookie: value.cookie },
        });
        const session = await fetch(value.view.origin + remoteRoutes.session, {
            headers: { cookie: value.cookie },
        });
        const foreign = await fetch(value.view.origin + '/api/value', {
            headers: { cookie: value.cookie, origin: 'http://unrelated.example' },
        });
        const unknown = await fetch(value.view.origin + '/api/proxy?url=http://127.0.0.1:1', {
            headers: { cookie: value.cookie },
        });
        // Assert
        expect(value.view.origin).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/u);
        expect(value.view.cookie.value).not.toBe(value.token());
        expect(anonymous.status).toBe(401);
        expect(await asset.text()).toContain('Trusted packaged fixture');
        expect(await json.json()).toEqual({ value: 7 });
        expect(json.headers.has('set-cookie')).toBe(false);
        expect(await descriptor.json()).toMatchObject({ identity });
        expect(JSON.stringify(await session.json())).not.toContain(value.token());
        expect(foreign.status).toBe(403);
        expect(unknown.status).toBe(403);
        expect(value.requests()).toBe(1);
    });

    it('revokes through its explicit session control and then closes the local view without exposing pairing', async () => {
        // Arrange
        const value = await fixture();
        const pairing = await fetch(value.view.origin + remoteRoutes.pairings, {
            method: 'POST',
            headers: { cookie: value.cookie },
        });
        // Act
        const revoked = await fetch(value.view.origin + remoteRoutes.session, {
            method: 'DELETE',
            headers: { cookie: value.cookie },
        });
        await value.gateway.dispose();
        // Assert
        expect(pairing.status).toBe(403);
        expect(revoked.status).toBe(204);
        expect(value.token()).toBeNull();
        expect(value.access.getStatus().devices).toHaveLength(0);
    });

    it('rejects remote executable responses and cancels upstream SSE when the local view is disposed', async () => {
        // Arrange
        const value = await fixture();
        const active = await fetch(value.view.origin + '/api/remote-script', {
            headers: { cookie: value.cookie },
        });
        const stream = await fetch(value.view.origin + '/api/events', {
            headers: { cookie: value.cookie },
        });
        const reader = stream.body!.getReader();
        expect(new TextDecoder().decode((await reader.read()).value)).toContain('data: first');
        const closed = reader.read().then(
            (item) => item.done,
            () => true,
        );
        // Act
        let firstDisposalCompleted = false;
        const firstDisposal = value.gateway.dispose().then(() => {
            firstDisposalCompleted = true;
        });
        await value.gateway.dispose();
        // Assert
        expect(firstDisposalCompleted).toBe(true);
        await firstDisposal;
        expect(active.status).toBe(403);
        expect(await closed).toBe(true);
        await new Promise<void>((complete) => setImmediate(complete));
        expect(value.cancelled()).toBe(1);
    });

    it('forwards bounded binary WebSocket messages and closes the local socket when its remote device is revoked', async () => {
        // Arrange
        const value = await fixture();
        const socket = new WebSocket(value.view.origin.replace('http:', 'ws:') + '/api/socket', {
            headers: { cookie: value.cookie, origin: value.view.origin },
        });
        socket.on('error', () => undefined);
        await once(socket, 'open');
        const echoed = once(socket, 'message');
        const closed = once(socket, 'close');
        // Act
        socket.send(Buffer.from([0, 255, 128]), { binary: true });
        const [data, binary] = await echoed;
        await value.host.revokeDevice(value.access.getStatus().devices[0]!.id);
        // Assert
        expect(data).toEqual(Buffer.from([0, 255, 128]));
        expect(binary).toBe(true);
        await closed;
    });
    it('releases a remote connection when a local WebSocket handshake is rejected', async () => {
        // Arrange
        const value = await fixture(1);
        // Act
        const status = await new Promise<number>((complete, reject) => {
            const request = httpRequest(
                value.view.origin + '/api/socket',
                {
                    headers: {
                        cookie: value.cookie,
                        origin: value.view.origin,
                        connection: 'Upgrade',
                        upgrade: 'websocket',
                        'sec-websocket-version': '12',
                        'sec-websocket-key': 'MDEyMzQ1Njc4OWFiY2RlZg==',
                    },
                },
                (response) => {
                    response.resume();
                    complete(response.statusCode!);
                },
            );
            request.on('error', reject);
            request.end();
        });
        const response = await fetch(value.view.origin + '/api/value', {
            headers: { cookie: value.cookie },
        });
        // Assert
        expect(status).toBe(400);
        expect(response.status).toBe(200);
        await response.text();
        await value.gateway.dispose();
    });

    it('closes the pending local handshake when its upstream has already closed and releases the request slot', async () => {
        // Arrange
        const value = await fixture(1, true);
        let opened = false;
        const socket = new WebSocket(value.view.origin.replace('http:', 'ws:') + '/api/socket', {
            headers: { cookie: value.cookie, origin: value.view.origin },
        });
        socket.on('error', () => undefined);
        socket.on('open', () => {
            opened = true;
        });
        const closed = new Promise<void>((complete) => {
            socket.once('close', () => complete());
        });
        // Act
        await closed;
        const response = await fetch(value.view.origin + '/api/value', {
            headers: { cookie: value.cookie },
        });
        // Assert
        expect(opened).toBe(false);
        expect(response.status).toBe(200);
        await response.text();
    });
});
