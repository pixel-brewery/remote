// #region Imports
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RemoteAccessService } from '@pixel-brewery/remote-core';
import type { IRemoteCredentialStore } from '@pixel-brewery/remote-client';
import type { IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
import { NodeRemoteHost } from '../host/NodeRemoteHost.js';
import { NodeRemoteSecurity } from '../security/NodeRemoteSecurity.js';
import { NodeRemoteConnector } from './NodeRemoteConnector.js';
import type { IRemoteApplicationAdapter } from '../host/interfaces/IRemoteApplicationAdapter.js';
// #endregion

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
    for (const dispose of cleanup.splice(0).reverse()) await dispose();
});
const identity = { appId: 'test.native', hostId: 'host-one' };
const routes: readonly IRemoteRouteDefinition[] = [
    {
        id: 'binary',
        method: 'GET',
        path: '/api/binary',
        kind: 'http',
        capabilities: ['read'],
        retry: 'safe-read',
    },
    {
        id: 'upload',
        method: 'POST',
        path: '/api/upload',
        kind: 'http',
        capabilities: ['write'],
        retry: 'never',
    },
    {
        id: 'redirect',
        method: 'GET',
        path: '/api/redirect',
        kind: 'http',
        capabilities: ['read'],
        retry: 'safe-read',
    },
];

async function fixture(application: IRemoteApplicationAdapter) {
    let state: unknown = null;
    let token: string | null = null;
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
        capabilities: ['read', 'write'],
    });
    const host = new NodeRemoteHost({
        identity,
        name: 'Native transport fixture',
        access,
        routes,
        application,
        host: '127.0.0.1',
        port: 0,
        allowLoopbackForTests: true,
    });
    cleanup.push(() => host.dispose());
    await host.enable();
    const store: IRemoteCredentialStore = {
        get: async () => token,
        set: async (_identity, value) => {
            token = value;
        },
        delete: async () => {
            token = null;
        },
    };
    const controller = new AbortController();
    const connector = new NodeRemoteConnector({
        expectedIdentity: identity,
        credentialStore: store,
        routes,
        allowLoopbackForTests: true,
    });
    const transport = await connector.connect(host.descriptor.endpoints[0]!, controller.signal);
    cleanup.push(() => transport.dispose());
    return { host, access, store, connector, transport, controller, token: () => token };
}

describe('NodeRemoteClientTransport', () => {
    it('protects the bearer before returning a credential-free result and recovers the same attempt after a storage failure', async () => {
        // Arrange
        const value = await fixture({
            handle: async (_request, response) => {
                response.end();
            },
        });
        const bootstrap = await value.host.createPairing();
        const save = value.store.set.bind(value.store);
        let first = true;
        value.store.set = async (namespace, token) => {
            if (first) {
                first = false;
                throw new Error('OS vault unavailable');
            }
            await save(namespace, token);
        };
        // Act
        await expect(
            value.transport.pair(
                bootstrap,
                'Native device',
                'attempt-1234567890',
                value.controller.signal,
            ),
        ).rejects.toMatchObject({ code: 'persistence' });
        const paired = await value.transport.pair(
            bootstrap,
            'Native device',
            'attempt-1234567890',
            value.controller.signal,
        );
        // Assert
        expect(paired.status).toBe('paired');
        expect(paired).not.toHaveProperty('credential');
        expect(value.token()).toHaveLength(43);
        expect(value.access.getStatus().devices).toHaveLength(1);
        expect(await value.transport.session(value.controller.signal)).not.toBeNull();
    });

    it('checks host identity before reading credentials and rejects public or unknown destination forms before network I/O', async () => {
        // Arrange
        const value = await fixture({
            handle: async (_request, response) => {
                response.end();
            },
        });
        const read = vi.fn(async () => 'private-credential-never-send');
        const connector = new NodeRemoteConnector({
            expectedIdentity: { ...identity, hostId: 'foreign-host' },
            credentialStore: {
                get: read,
                set: async () => undefined,
                delete: async () => undefined,
            },
            routes,
            allowLoopbackForTests: true,
        });
        // Act / Assert
        await expect(
            connector.connect(value.host.descriptor.endpoints[0]!, value.controller.signal),
        ).rejects.toMatchObject({ code: 'incompatible' });
        for (const origin of [
            'http://example.com',
            'http://8.8.8.8',
            'http://169.254.169.254',
            'http://192.168.1.2/path',
            'http://192.168.001.2',
        ]) {
            await expect(
                connector.connect(
                    { id: 'lan-http', transportId: 'lan-http', origin },
                    value.controller.signal,
                ),
            ).rejects.toHaveProperty('code');
        }
        expect(read).not.toHaveBeenCalled();
    });

    it('preserves binary Range, multipart bytes and query strings while refusing redirects and authority headers', async () => {
        // Arrange
        let uploaded = Buffer.alloc(0);
        let uploadType = '';
        let requestUrl = '';
        let range = '';
        const value = await fixture({
            handle: async (request, response, context) => {
                if (context.operationId === 'redirect') {
                    response.writeHead(302, { Location: 'http://127.0.0.1:1/never' }).end();
                    return;
                }
                if (context.operationId === 'upload') {
                    uploadType = request.headers['content-type']!;
                    const chunks: Buffer[] = [];
                    for await (const chunk of request)
                        chunks.push(Buffer.from(chunk as Uint8Array));
                    uploaded = Buffer.concat(chunks);
                    response
                        .writeHead(201, { 'Content-Type': 'application/json' })
                        .end('{"uploaded":true}');
                    return;
                }
                requestUrl = request.url!;
                range = request.headers.range!;
                response
                    .writeHead(206, {
                        'Content-Type': 'application/octet-stream',
                        'Content-Range': 'bytes 2-4/6',
                        'Set-Cookie': 'forbidden=remote',
                    })
                    .end(Buffer.from([0, 255, 128]));
            },
        });
        await value.transport.pair(
            await value.host.createPairing(),
            'Native device',
            'attempt-1234567890',
            value.controller.signal,
        );
        const multipart = Buffer.from(
            '--fixture\r\nContent-Disposition: form-data; name="file"\r\n\r\nraw\u0000bytes\r\n--fixture--\r\n',
        );
        // Act
        const binary = await value.transport.request({
            method: 'GET',
            path: '/api/binary?download=1',
            headers: { range: 'bytes=2-4' },
        });
        const chunks: Uint8Array[] = [];
        for await (const chunk of binary.body) chunks.push(chunk);
        const uploadedResponse = await value.transport.request({
            method: 'POST',
            path: '/api/upload',
            headers: { 'content-type': 'multipart/form-data; boundary=fixture' },
            body: (async function* () {
                yield multipart.subarray(0, 9);
                yield multipart.subarray(9);
            })(),
        });
        await uploadedResponse.cancel();
        // Assert
        expect(binary.status).toBe(206);
        expect(binary.headers['content-range']).toBe('bytes 2-4/6');
        expect(binary.headers).not.toHaveProperty('set-cookie');
        expect(Buffer.concat(chunks)).toEqual(Buffer.from([0, 255, 128]));
        expect(range).toBe('bytes=2-4');
        expect(requestUrl).toBe('/api/binary?download=1');
        expect(uploaded).toEqual(multipart);
        expect(uploadType).toBe('multipart/form-data; boundary=fixture');
        await expect(
            value.transport.request({ method: 'GET', path: '/api/redirect' }),
        ).rejects.toMatchObject({ code: 'forbidden' });
        await expect(
            value.transport.request({
                method: 'GET',
                path: '/api/binary',
                headers: { authorization: 'Bearer external' },
            }),
        ).rejects.toMatchObject({ code: 'forbidden' });
    });

    it('dispatches a mutation only once and reports an unknown outcome when its response is lost', async () => {
        // Arrange
        let effects = 0;
        const value = await fixture({
            handle: async (request, response) => {
                for await (const _chunk of request) {
                    /* Consume before committing the fixture effect. */
                }
                effects++;
                response.destroy();
            },
        });
        await value.transport.pair(
            await value.host.createPairing(),
            'Native device',
            'attempt-1234567890',
            value.controller.signal,
        );
        // Act
        const operation = value.transport.request({
            method: 'POST',
            path: '/api/upload',
            body: (async function* () {
                yield new Uint8Array([1, 2]);
            })(),
        });
        // Assert
        await expect(operation).rejects.toMatchObject({ code: 'unknown-outcome' });
        expect(effects).toBe(1);
    });
});
