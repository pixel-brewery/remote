// #region Imports
import { afterEach, describe, expect, it } from 'vitest';
import { request as httpRequest } from 'node:http';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { RemoteAccessService } from '@pixel-brewery/remote-core';
import { remoteRoutes, type IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
import { NodeRemoteHost } from './NodeRemoteHost.js';
import { NodeRemoteSecurity } from '../security/NodeRemoteSecurity.js';
import type { IRemoteApplicationAdapter } from './interfaces/IRemoteApplicationAdapter.js';
// #endregion

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
    for (const dispose of cleanup.splice(0).reverse()) await dispose();
});

const routes: readonly IRemoteRouteDefinition[] = [
    {
        id: 'read',
        method: 'GET',
        path: '/api/value',
        kind: 'http',
        capabilities: ['read'],
        retry: 'safe-read',
    },
    {
        id: 'write',
        method: 'POST',
        path: '/api/value',
        kind: 'http',
        capabilities: ['write'],
        retry: 'never',
        maxRequestBytes: 8,
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
];

async function fixture(application: IRemoteApplicationAdapter, capabilities = ['read', 'write']) {
    let stored: unknown = null;
    let failSave = false;
    const access = new RemoteAccessService({
        identity: { appId: 'test.app', hostId: 'host-one' },
        store: {
            load: async () => stored,
            save: async (value) => {
                if (failSave) throw new Error('Injected write failure');
                stored = structuredClone(value);
            },
        },
        security: new NodeRemoteSecurity(),
        clock: { now: () => Date.now() },
        capabilities,
    });
    const host = new NodeRemoteHost({
        identity: { appId: 'test.app', hostId: 'host-one' },
        name: 'Host under test',
        access,
        routes,
        application,
        host: '127.0.0.1',
        port: 0,
        allowLoopbackForTests: true,
    });
    cleanup.push(() => host.dispose());
    await host.enable();
    const origin = host.descriptor.endpoints[0]!.origin;
    const bootstrap = await host.createPairing();
    const pair = async (credentialMode: 'bearer' | 'cookie') =>
        fetch(origin + remoteRoutes.pairings, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                challenge: bootstrap.challenge,
                deviceName: 'Test browser',
                attemptId: 'attempt-1234567890',
                credentialMode,
            }),
        });
    return {
        host,
        access,
        origin,
        pair,
        failSaves: () => {
            failSave = true;
        },
    };
}

describe('NodeRemoteHost', () => {
    it('requires scoped device authority and passes the original request stream into the application', async () => {
        // Arrange
        let calls = 0;
        let originalUrl = '';
        const value = await fixture({
            handle: async (request, response, context) => {
                calls++;
                originalUrl = request.url!;
                expect(context.principal.appId).toBe('test.app');
                response
                    .writeHead(207, { 'Content-Type': 'application/json' })
                    .end('{"accepted":true}');
            },
        });
        expect((await fetch(value.origin + '/api/value')).status).toBe(401);
        const paired = (await (await value.pair('bearer')).json()) as { credential: string };
        // Act
        const response = await fetch(value.origin + '/api/value?projection=small', {
            headers: { authorization: 'Bearer ' + paired.credential },
        });
        // Assert
        expect(response.status).toBe(207);
        expect(await response.json()).toEqual({ accepted: true });
        expect(calls).toBe(1);
        expect(originalUrl).toBe('/api/value?projection=small');
    });

    it('uses an HttpOnly browser cookie without returning a bearer and denies foreign Host and Origin', async () => {
        // Arrange
        const value = await fixture({
            handle: async (_request, response) => {
                response.end('authorized');
            },
        });
        const paired = await value.pair('cookie');
        const cookie = paired.headers.get('set-cookie')!;
        // Act
        const result = await paired.json();
        const authenticated = await fetch(value.origin + '/api/value', {
            headers: { cookie: cookie.split(';')[0]! },
        });
        const foreignOrigin = await fetch(value.origin + remoteRoutes.host, {
            headers: { origin: 'http://unrelated.example' },
        });
        const foreignHost = await new Promise<number>((complete, reject) => {
            const request = httpRequest(
                value.origin + remoteRoutes.host,
                { headers: { host: 'unrelated.example' } },
                (response) => {
                    response.resume();
                    complete(response.statusCode!);
                },
            );
            request.on('error', reject);
            request.end();
        });
        // Assert
        expect(result).not.toHaveProperty('credential');
        expect(cookie).toContain('HttpOnly');
        expect(cookie).toContain('SameSite=Strict');
        expect(authenticated.status).toBe(200);
        await authenticated.text();
        expect(foreignOrigin.status).toBe(403);
        expect(foreignHost).toBe(403);
    });

    it('enforces route capabilities and declared byte bounds before application dispatch', async () => {
        // Arrange
        let calls = 0;
        const value = await fixture(
            {
                handle: async (_request, response) => {
                    calls++;
                    response.end();
                },
            },
            ['read'],
        );
        const paired = (await (await value.pair('bearer')).json()) as { credential: string };
        // Act
        const denied = await fetch(value.origin + '/api/value', {
            method: 'POST',
            body: 'small',
            headers: { authorization: 'Bearer ' + paired.credential },
        });
        const unknown = await fetch(value.origin + '/api/unknown', {
            headers: { authorization: 'Bearer ' + paired.credential },
        });
        // Assert
        expect(denied.status).toBe(403);
        expect(unknown.status).toBe(403);
        expect(calls).toBe(0);
    });

    it('cancels existing SSE and WebSocket connections immediately after durable device revocation', async () => {
        // Arrange
        const value = await fixture({
            handle: async (_request, response) => {
                response.writeHead(200, { 'Content-Type': 'text/event-stream' });
                response.write('data: initial\n\n');
            },
            webSocket: async (socket) => {
                socket.on('message', (data) => socket.send(data));
            },
        });
        const paired = (await (await value.pair('bearer')).json()) as {
            credential: string;
            session: { principal: { deviceId: string } };
        };
        const stream = await fetch(value.origin + '/api/events', {
            headers: { authorization: 'Bearer ' + paired.credential },
        });
        const reader = stream.body!.getReader();
        await reader.read();
        const socket = new WebSocket(value.origin.replace('http:', 'ws:') + '/api/socket', {
            headers: { authorization: 'Bearer ' + paired.credential },
        });
        socket.on('error', () => undefined);
        await once(socket, 'open');
        const socketClosed = once(socket, 'close');
        const streamClosed = reader.read().then(
            (read) => read.done,
            () => true,
        );
        // Act
        await value.host.revokeDevice(paired.session.principal.deviceId);
        // Assert
        await socketClosed;
        expect(await streamClosed).toBe(true);
        expect(
            (
                await fetch(value.origin + '/api/value', {
                    headers: { authorization: 'Bearer ' + paired.credential },
                })
            ).status,
        ).toBe(401);
    });

    it('does not dispatch an action when revocation commits during product authorization', async () => {
        // Arrange
        let admitted!: () => void;
        let release!: () => void;
        let calls = 0;
        const entered = new Promise<void>((complete) => {
            admitted = complete;
        });
        const barrier = new Promise<void>((complete) => {
            release = complete;
        });
        const value = await fixture({
            authorize: async () => {
                admitted();
                await barrier;
            },
            handle: async (_request, response) => {
                calls++;
                response.end();
            },
        });
        const paired = (await (await value.pair('bearer')).json()) as {
            credential: string;
            session: { principal: { deviceId: string } };
        };
        const request = fetch(value.origin + '/api/value', {
            headers: { authorization: 'Bearer ' + paired.credential },
        }).catch(() => null);
        await entered;
        // Act
        await value.host.revokeDevice(paired.session.principal.deviceId);
        release();
        await request;
        // Assert
        expect(calls).toBe(0);
    });
    it('keeps a failed disable locally stopped when background network reconciliation runs', async () => {
        // Arrange
        const value = await fixture({
            handle: async (_request, response) => {
                response.end();
            },
        });
        value.failSaves();
        await expect(value.host.disable()).rejects.toMatchObject({ code: 'persistence' });
        // Act
        await value.host.reconcile();
        // Assert
        expect(value.access.enabled).toBe(true);
        expect(value.host.status()).toMatchObject({
            state: 'unavailable',
            errorCode: 'persistence',
        });
        expect(value.host.descriptor.endpoints).toHaveLength(0);
        await expect(fetch(value.origin + '/__remote/v1/host')).rejects.toThrow();
    });
});
