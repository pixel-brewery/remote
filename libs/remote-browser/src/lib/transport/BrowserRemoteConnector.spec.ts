// #region Imports
import { expect, it, vi } from 'vitest';
import { BrowserRemoteConnector } from './BrowserRemoteConnector.js';
// #endregion

const origin = 'http://192.168.1.10:4321',
    endpoint = { id: 'primary', transportId: 'lan-http', origin },
    identity = { appId: 'example', hostId: 'one' },
    host = { identity, name: 'Host', protocolVersion: 1, endpoints: [endpoint] };
it('uses cookies and rejects cross-origin or authority-bearing dispatch', async () => {
    // Arrange
    const fetcher = vi.fn<typeof fetch>(
        async () =>
            new Response(JSON.stringify(host), { headers: { 'content-type': 'application/json' } }),
    );
    const connector = new BrowserRemoteConnector({ origin, fetch: fetcher });
    const lifetime = new AbortController();
    // Act
    const transport = await connector.connect(endpoint, lifetime.signal);
    await transport.describe(lifetime.signal);
    // Assert
    expect(fetcher).toHaveBeenCalledWith(
        origin + '/__remote/v1/host',
        expect.objectContaining({ credentials: 'same-origin', redirect: 'error' }),
    );
    await expect(
        connector.connect({ ...endpoint, origin: 'http://192.168.1.20:4321' }, lifetime.signal),
    ).rejects.toThrow();
    await expect(
        transport.request({
            method: 'GET',
            path: '/api/read',
            headers: { authorization: 'Bearer injected' },
        }),
    ).rejects.toThrow('authority');
    await transport.dispose();
});
it('retains protocol-body cancellation after response headers arrive', async () => {
    // Arrange
    let bodyController: ReadableStreamDefaultController<Uint8Array> | undefined;
    let headers: (() => void) | undefined;
    const headerReady = new Promise<void>((done) => {
        headers = done;
    });
    const fetcher: typeof fetch = async (_input, options) => {
        const body = new ReadableStream<Uint8Array>({
            start(controller) {
                bodyController = controller;
            },
        });
        options?.signal?.addEventListener(
            'abort',
            () => bodyController?.error(new Error('Cancelled body.')),
            { once: true },
        );
        headers?.();
        return new Response(body);
    };
    const connector = new BrowserRemoteConnector({ origin, fetch: fetcher });
    const controller = new AbortController();
    const transport = await connector.connect(endpoint, controller.signal);
    // Act
    const describe = transport.describe(controller.signal);
    await headerReady;
    await transport.dispose();
    // Assert
    await expect(describe).rejects.toThrow('Cancelled body');
});
it('rejects native credentials in cookie pairing replies', async () => {
    // Arrange
    const fetcher: typeof fetch = async () =>
        new Response(
            JSON.stringify({
                status: 'paired',
                session: { host, principal: { ...identity, deviceId: 'phone', capabilities: [] } },
                credential: 'x'.repeat(48),
            }),
        );
    const connector = new BrowserRemoteConnector({ origin, fetch: fetcher });
    const controller = new AbortController();
    const transport = await connector.connect(endpoint, controller.signal);
    // Act / Assert
    await expect(
        transport.pair(
            {
                ...identity,
                origin,
                challenge: 'x'.repeat(48),
                expiresAt: '2030-01-01T00:00:00.000Z',
            },
            'Phone',
            'attempt',
            controller.signal,
        ),
    ).rejects.toThrow('bearer');
    await transport.dispose();
});
it('dispatches an HTTP1-compatible bounded body once without requiring streaming fetch', async () => {
    // Arrange
    const fetcher = vi.fn<typeof fetch>(async () => new Response('ok'));
    const connector = new BrowserRemoteConnector({
        origin,
        fetch: fetcher,
        maximumBufferedRequestBytes: 16,
    });
    const controller = new AbortController();
    const transport = await connector.connect(endpoint, controller.signal);
    // Act
    const response = await transport.request({
        method: 'POST',
        path: '/api/write',
        body: (async function* () {
            yield new Uint8Array([1, 2]);
            yield new Uint8Array([3]);
        })(),
    });
    await response.cancel();
    // Assert
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[1]?.body).toBeInstanceOf(ArrayBuffer);
    expect(new Uint8Array(fetcher.mock.calls[0]?.[1]?.body as ArrayBuffer)).toEqual(
        new Uint8Array([1, 2, 3]),
    );
    expect(fetcher.mock.calls[0]?.[1]).not.toHaveProperty('duplex');
    await transport.dispose();
});
it('rejects oversized request bodies before network dispatch', async () => {
    // Arrange
    const fetcher = vi.fn<typeof fetch>(async () => new Response('unused'));
    const connector = new BrowserRemoteConnector({
        origin,
        fetch: fetcher,
        maximumBufferedRequestBytes: 2,
    });
    const controller = new AbortController();
    const transport = await connector.connect(endpoint, controller.signal);
    // Act / Assert
    await expect(
        transport.request({
            method: 'POST',
            path: '/api/write',
            body: (async function* () {
                yield new Uint8Array([1, 2, 3]);
            })(),
        }),
    ).rejects.toMatchObject({ code: 'resource-limit' });
    expect(fetcher).not.toHaveBeenCalled();
    await transport.dispose();
});
it('allows cancellation after a consumed response without reusing a released reader', async () => {
    // Arrange
    const connector = new BrowserRemoteConnector({
        origin,
        fetch: async () => new Response('complete'),
    });
    const controller = new AbortController();
    const transport = await connector.connect(endpoint, controller.signal);
    const response = await transport.request({ method: 'GET', path: '/api/read' });
    // Act
    for await (const _chunk of response.body) {
        /* consume */
    }
    // Assert
    await expect(response.cancel()).resolves.toBeUndefined();
    await expect(response.cancel()).resolves.toBeUndefined();
    await transport.dispose();
});
