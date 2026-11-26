// #region Imports
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServer, request as httpRequest, type Server } from 'node:http';
import { once } from 'node:events';
import { RemoteProtocolError } from '@pixel-brewery/remote-protocol';
import { handleRemoteHostControl } from './handleRemoteHostControl.js';
import type { IRemoteHostControl } from './interfaces/IRemoteHostControl.js';
import type { IRemoteHostControlOptions } from './interfaces/IRemoteHostControlOptions.js';
import type { IRemoteHostStatus } from './interfaces/IRemoteHostStatus.js';
// #endregion

const servers: Server[] = [];
afterEach(async () => {
    for (const server of servers.splice(0)) {
        server.closeAllConnections();
        await new Promise<void>((complete) => server.close(() => complete()));
    }
});

const status: IRemoteHostStatus = {
    state: 'available',
    host: {
        identity: { appId: 'test.app', hostId: 'installation' },
        name: 'Host under test',
        protocolVersion: 1,
        endpoints: [],
    },
    access: { enabled: true, devices: [], pendingPairings: [] },
};

function control() {
    return {
        status: vi.fn(() => status),
        enable: vi.fn(() => Promise.resolve()),
        disable: vi.fn(() => Promise.resolve()),
        reconcile: vi.fn(() => Promise.resolve()),
        revokeDevice: vi.fn((_deviceId: string) => Promise.resolve()),
        createPairing: vi.fn(async (_endpointId?: string) => ({
            appId: 'test.app',
            hostId: 'installation',
            origin: 'http://192.168.1.10:49152',
            challenge: 'a'.repeat(43),
            expiresAt: '2026-11-26T10:05:00.000Z',
        })),
    } satisfies IRemoteHostControl;
}

async function serve(
    target: IRemoteHostControl | undefined,
    options?: IRemoteHostControlOptions,
): Promise<string> {
    const server = createServer((request, response) => {
        void handleRemoteHostControl(request, response, target, options);
    });
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test address.');
    return `http://127.0.0.1:${address.port}`;
}

function post(origin: string, path: string, body: string, type = 'application/json') {
    return fetch(origin + '/__host/remote/v1' + path, {
        method: 'POST',
        headers: { 'content-type': type },
        body,
    });
}

describe('handleRemoteHostControl', () => {
    it('reads status without commands and answers a write only after its durable completion', async () => {
        // Arrange
        const host = control();
        let complete: () => void = () => undefined;
        const started = new Promise<void>((signal) => {
            host.disable.mockImplementation(
                () =>
                    new Promise<void>((resolve) => {
                        complete = resolve;
                        signal();
                    }),
            );
        });
        const origin = await serve(host);
        // Act
        const read = await fetch(origin + '/__host/remote/v1/status');
        let answered = false;
        const disabling = post(origin, '/disable', '{}').then((response) => {
            answered = true;
            return response;
        });
        await started;
        await new Promise((resolve) => setImmediate(resolve));
        const answeredBeforeSave = answered;
        complete();
        const disabled = await disabling;
        // Assert
        expect(read.status).toBe(200);
        expect(read.headers.get('content-type')).toBe('application/json; charset=utf-8');
        expect(read.headers.get('cache-control')).toBe('no-store');
        expect(await read.json()).toEqual(status);
        expect(answeredBeforeSave).toBe(false);
        expect(disabled.status).toBe(200);
        expect(await disabled.json()).toEqual(status);
        expect(host.enable).not.toHaveBeenCalled();
        expect(host.createPairing).not.toHaveBeenCalled();
    });

    it('runs each closed command and returns the invitation only to the pairing caller', async () => {
        // Arrange
        const host = control();
        const origin = await serve(host);
        // Act
        const results = [
            await post(origin, '/enable', '{}'),
            await post(origin, '/reconcile', '{}'),
            await post(origin, '/revoke', '{"deviceId":"device-one"}'),
        ];
        const pairing = await post(origin, '/pair', '{"endpointId":"http-lan"}');
        const defaultPairing = await post(origin, '/pair', '{}');
        // Assert
        for (const result of results) {
            expect(result.status).toBe(200);
            expect(await result.json()).toEqual(status);
        }
        expect(pairing.status).toBe(200);
        expect(await pairing.json()).toMatchObject({ challenge: 'a'.repeat(43) });
        await defaultPairing.text();
        expect(host.enable).toHaveBeenCalledTimes(1);
        expect(host.reconcile).toHaveBeenCalledTimes(1);
        expect(host.revokeDevice).toHaveBeenCalledWith('device-one');
        expect(host.createPairing.mock.calls).toEqual([['http-lan'], [undefined]]);
    });

    it('does not interpret queries, trailing paths, unknown commands or arbitrary methods', async () => {
        // Arrange
        const host = control();
        const origin = await serve(host);
        const samples = [
            ['/__host/remote/v1/enable?method=stop', 'POST', 404],
            ['/__host/remote/v1/enable/', 'POST', 404],
            ['/__host/remote/v1/status?', 'GET', 404],
            ['/__host/remote/v1/command', 'POST', 404],
            ['/__host/remote/v1', 'GET', 404],
            ['/other/status', 'GET', 404],
            ['/__host/remote/v1/enable', 'GET', 405],
            ['/__host/remote/v1/status', 'POST', 405],
            ['/__host/remote/v1/status', 'HEAD', 405],
        ] as const;
        // Act / Assert
        for (const [path, method, expected] of samples) {
            const response = await fetch(origin + path, {
                method,
                ...(method === 'POST'
                    ? { body: '{}', headers: { 'content-type': 'application/json' } }
                    : {}),
            });
            await response.arrayBuffer();
            expect(response.status).toBe(expected);
            if (expected === 405)
                expect(response.headers.get('allow')).toBe(
                    path.endsWith('status') ? 'GET' : 'POST',
                );
        }
        expect(host.enable).not.toHaveBeenCalled();
        expect(host.status).not.toHaveBeenCalled();
    });

    it('rejects non-JSON, malformed and unknown bodies with 422 before any command', async () => {
        // Arrange
        const host = control();
        const origin = await serve(host);
        // Act
        const responses = [
            await post(origin, '/enable', '{}', 'text/plain'),
            await post(origin, '/enable', '{'),
            await post(origin, '/enable', ''),
            await post(origin, '/enable', '{"enabled":true}'),
            await post(origin, '/revoke', '{"deviceId":"../x"}'),
        ];
        // Assert
        for (const response of responses) {
            expect(response.status).toBe(422);
            expect(await response.json()).toMatchObject({ error: { code: 'invalid-request' } });
        }
        expect(host.enable).not.toHaveBeenCalled();
        expect(host.revokeDevice).not.toHaveBeenCalled();
    });

    it('refuses declared and streamed oversized bodies with 413 and closes the connection', async () => {
        // Arrange
        const host = control();
        const origin = await serve(host);
        const limited = await serve(host, { maxBodyBytes: 16 });
        // Act
        const declared = await post(origin, '/enable', '{"padding":"' + 'a'.repeat(2048) + '"}');
        const small = await post(limited, '/pair', '{"endpointId":"http-lan"}');
        const streamed = await new Promise<{ status: number; connection: string | undefined }>(
            (resolve, reject) => {
                const request = httpRequest(
                    origin + '/__host/remote/v1/enable',
                    { method: 'POST', headers: { 'content-type': 'application/json' } },
                    (response) => {
                        response.resume();
                        resolve({
                            status: response.statusCode ?? 0,
                            connection: response.headers.connection,
                        });
                        request.destroy();
                    },
                );
                request.on('error', reject);
                request.flushHeaders();
                request.write('{"padding":"' + 'a'.repeat(1024));
                setImmediate(() => request.write('a'.repeat(1024) + '"'));
            },
        );
        // Assert
        expect(declared.status).toBe(413);
        expect(declared.headers.get('connection')).toBe('close');
        expect(await declared.json()).toMatchObject({ error: { code: 'resource-limit' } });
        expect(small.status).toBe(413);
        await small.arrayBuffer();
        expect(streamed).toEqual({ status: 413, connection: 'close' });
        expect(host.enable).not.toHaveBeenCalled();
        expect(host.createPairing).not.toHaveBeenCalled();
    });

    it('maps missing control, full queues and host failures to 503 without leaking causes', async () => {
        // Arrange
        const host = control();
        host.enable.mockRejectedValueOnce(
            new RemoteProtocolError('resource-limit', 'Too many remote host commands are pending.'),
        );
        host.disable.mockRejectedValueOnce(new Error('/private/storage/path is read-only'));
        host.revokeDevice.mockRejectedValueOnce(
            new RemoteProtocolError('forbidden', 'This device cannot be revoked here.'),
        );
        host.status.mockImplementationOnce(() => {
            throw new RemoteProtocolError('not-ready', 'Device authorization is not initialized.');
        });
        const origin = await serve(host);
        const unavailable = await serve(undefined);
        // Act
        const missing = await fetch(unavailable + '/__host/remote/v1/status');
        const uninitialized = await fetch(origin + '/__host/remote/v1/status');
        const busy = await post(origin, '/enable', '{}');
        const failed = await post(origin, '/disable', '{}');
        const forbidden = await post(origin, '/revoke', '{"deviceId":"device-one"}');
        // Assert
        expect(missing.status).toBe(503);
        expect(await missing.json()).toMatchObject({ error: { code: 'not-ready' } });
        expect(uninitialized.status).toBe(503);
        await uninitialized.arrayBuffer();
        expect(busy.status).toBe(503);
        expect(busy.headers.get('connection')).not.toBe('close');
        expect(await busy.json()).toMatchObject({ error: { code: 'resource-limit' } });
        expect(failed.status).toBe(503);
        expect(JSON.stringify(await failed.json())).not.toContain('/private');
        expect(forbidden.status).toBe(403);
        await forbidden.arrayBuffer();
    });

    it('honours a custom prefix and rejects invalid endpoint options', async () => {
        // Arrange
        const host = control();
        const origin = await serve(host, { prefix: '/local/remote' });
        // Act
        const custom = await fetch(origin + '/local/remote/status');
        const standard = await fetch(origin + '/__host/remote/v1/status');
        // Assert
        expect(custom.status).toBe(200);
        await custom.arrayBuffer();
        expect(standard.status).toBe(404);
        await standard.arrayBuffer();
        for (const options of [
            { prefix: '/' },
            { prefix: 'local' },
            { prefix: '/local/' },
            { prefix: '/lo%63al' },
            { maxBodyBytes: 1 },
            { maxBodyBytes: 65537 },
        ])
            await expect(
                handleRemoteHostControl({} as never, {} as never, host, options),
            ).rejects.toMatchObject({ code: 'invalid-request' });
    });
});
