// #region Imports
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    createServer,
    request as httpRequest,
    type IncomingMessage,
    type Server,
    type ServerResponse,
} from 'node:http';
import { once } from 'node:events';
import type { IRemoteRequestContext } from '@pixel-brewery/remote-protocol';
import { createRemoteApplicationHandler } from './createRemoteApplicationHandler.js';
import { RemoteRequestAdmissions } from './RemoteRequestAdmissions.js';
// #endregion

const servers: Server[] = [];
afterEach(async () => {
    for (const server of servers.splice(0)) {
        server.closeAllConnections();
        await new Promise<void>((complete) => server.close(() => complete()));
    }
});

function context(abort: AbortController): IRemoteRequestContext {
    return {
        requestId: 'request-one',
        operationId: 'readItems',
        principal: {
            appId: 'test.app',
            hostId: 'host-one',
            deviceId: 'device-one',
            capabilities: ['items:read'],
        },
        signal: abort.signal,
    };
}

async function fixture(
    dispatch: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>,
    abortBeforeHandling = false,
) {
    const admissions = new RemoteRequestAdmissions();
    const releases = vi.fn();
    const received: Array<Record<string, unknown>> = [];
    const admit = vi.fn((request: IncomingMessage, admitted: IRemoteRequestContext) => {
        received.push({ ...request.headers });
        const release = admissions.admit(request, admitted);
        return () => {
            releases();
            release();
        };
    });
    const handle = createRemoteApplicationHandler(dispatch, admit);
    const abort = new AbortController();
    if (abortBeforeHandling) abort.abort();
    const outcome: { result?: Promise<void> } = {};
    const server = createServer((request, response) => {
        outcome.result = handle(request, response, context(abort));
        outcome.result.catch(() => {
            if (!response.headersSent) response.writeHead(500).end();
        });
    });
    servers.push(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test address.');
    return {
        origin: `http://127.0.0.1:${address.port}`,
        admissions,
        admit,
        received,
        releases,
        abort,
        outcome,
    };
}

describe('createRemoteApplicationHandler', () => {
    it('admits the request, strips device transport headers from every view and releases once', async () => {
        // Arrange
        let observed: Record<string, unknown> = {};
        const value = await fixture((request, response) => {
            observed = {
                admitted: value.admissions.has(request),
                headers: { ...request.headers },
                distinct: { ...request.headersDistinct },
                raw: [...request.rawHeaders],
            };
            response.end('dispatched');
        });
        // Act
        const response = await fetch(value.origin + '/api/items?page=2', {
            headers: {
                authorization: 'Bearer ' + 'a'.repeat(43),
                cookie: 'device=secret',
                origin: value.origin,
                'x-forwarded-for': '127.0.0.1',
                forwarded: 'for=127.0.0.1',
                'x-real-ip': '127.0.0.1',
                'x-application': 'kept',
            },
        });
        const text = await response.text();
        await value.outcome.result;
        // Assert
        expect(text).toBe('dispatched');
        expect(value.received[0]).toMatchObject({
            authorization: 'Bearer ' + 'a'.repeat(43),
            cookie: 'device=secret',
            origin: value.origin,
        });
        expect(observed['admitted']).toBe(true);
        for (const view of ['headers', 'distinct'] as const) {
            expect(observed[view]).not.toHaveProperty('authorization');
            expect(observed[view]).not.toHaveProperty('cookie');
            expect(observed[view]).not.toHaveProperty('origin');
            expect(observed[view]).not.toHaveProperty('x-forwarded-for');
            expect(observed[view]).not.toHaveProperty('forwarded');
            expect(observed[view]).not.toHaveProperty('x-real-ip');
        }
        expect(observed['headers']).toMatchObject({ 'x-application': 'kept' });
        expect(observed['distinct']).toMatchObject({ 'x-application': ['kept'] });
        const raw = (observed['raw'] as string[]).map((entry) => entry.toLowerCase());
        expect(raw).toContain('x-application');
        expect(raw).not.toContain('authorization');
        expect(raw).not.toContain('cookie');
        expect(raw).not.toContain('origin');
        expect(raw).not.toContain('device=secret');
        expect(raw).not.toContain('x-forwarded-for');
        expect(raw).not.toContain('x-real-ip');
        expect(raw.length % 2).toBe(0);
        await vi.waitFor(() => expect(value.releases).toHaveBeenCalledTimes(1));
        expect(value.admit).toHaveBeenCalledTimes(1);
    });

    it('releases exactly once when the context aborts before the response ends', async () => {
        // Arrange
        let entered: () => void = () => undefined;
        const dispatched = new Promise<void>((complete) => {
            entered = complete;
        });
        const value = await fixture(() => {
            entered();
        });
        const request = httpRequest(value.origin + '/api/stream');
        request.on('error', () => undefined);
        request.end();
        await dispatched;
        // Act
        value.abort.abort();
        request.destroy();
        // Assert
        await vi.waitFor(() => expect(value.releases).toHaveBeenCalledTimes(1));
        await new Promise((resolve) => setImmediate(resolve));
        expect(value.releases).toHaveBeenCalledTimes(1);
    });

    it('releases and rethrows synchronous and asynchronous dispatch failures', async () => {
        // Arrange
        const synchronous = new Error('synchronous dispatch failure');
        const asynchronous = new Error('asynchronous dispatch failure');
        const throwing = await fixture(() => {
            throw synchronous;
        });
        const rejecting = await fixture(async () => {
            await Promise.resolve();
            throw asynchronous;
        });
        // Act
        const first = await fetch(throwing.origin + '/api/items');
        const second = await fetch(rejecting.origin + '/api/items');
        await Promise.all([first.arrayBuffer(), second.arrayBuffer()]);
        // Assert
        await expect(throwing.outcome.result).rejects.toBe(synchronous);
        await expect(rejecting.outcome.result).rejects.toBe(asynchronous);
        expect(first.status).toBe(500);
        expect(second.status).toBe(500);
        await vi.waitFor(() => {
            expect(throwing.releases).toHaveBeenCalledTimes(1);
            expect(rejecting.releases).toHaveBeenCalledTimes(1);
        });
    });

    it('refuses an already aborted context without admission or dispatch', async () => {
        // Arrange
        const dispatch = vi.fn();
        const value = await fixture(dispatch, true);
        // Act
        const response = await fetch(value.origin + '/api/items');
        await response.arrayBuffer();
        // Assert
        await expect(value.outcome.result).rejects.toMatchObject({ code: 'unauthorized' });
        expect(dispatch).not.toHaveBeenCalled();
        expect(value.admit).not.toHaveBeenCalled();
    });
});
