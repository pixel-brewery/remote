// #region Imports
import type { IRemoteClientTransport, IRemoteConnector } from '@pixel-brewery/remote-client';
import {
    RemoteProtocolError,
    normalizeRemotePath,
    remoteHostDescriptorSchema,
    remotePairingResponseSchema,
    remoteSessionDescriptorSchema,
    remoteRoutes,
    type IRemoteByteRequest,
    type IRemoteByteResponse,
    type IRemoteEndpoint,
} from '@pixel-brewery/remote-protocol';
import type { IBrowserRemoteConnectorOptions } from './interfaces/IBrowserRemoteConnectorOptions.js';
// #endregion

/**
 * Same-origin cookie connector with bounded protocol JSON and streamed product bodies.
 * @remarks Bearer credentials never enter browser state. Dispose aborts both pending headers and bodies.
 * @public
 */
export class BrowserRemoteConnector implements IRemoteConnector {
    // #region Fields
    /**
     * Selected transport family, inferred from HTTP or HTTPS unless configured.
     * @public
     */
    public readonly id: string;
    private readonly _origin: string;
    // #endregion
    // #region Ctor
    /**
     * Construct without fetching or touching browser globals.
     * @param _options - Exact current origin, bound browser fetch and protocol byte limit.
     * @throws Error for credentials, paths or unsupported schemes in the origin.
     * @public
     */
    public constructor(private readonly _options: IBrowserRemoteConnectorOptions) {
        const url = new URL(_options.origin);
        if (
            !['http:', 'https:'].includes(url.protocol) ||
            url.origin !== _options.origin ||
            url.username ||
            url.password
        )
            throw new Error('Expected a plain HTTP(S) browser origin.');
        this._origin = url.origin;
        this.id = _options.transportId ?? (url.protocol === 'https:' ? 'lan-https' : 'lan-http');
        if (
            !Number.isSafeInteger(_options.protocolResponseBytes ?? 65_536) ||
            (_options.protocolResponseBytes ?? 65_536) < 1
        )
            throw new RangeError('Protocol byte bounds must be positive.');
    }
    // #endregion
    // #region Methods
    /**
     * Create an owned channel to this document's origin only.
     * @param endpoint - Selected endpoint matching origin and transport identifier.
     * @param signal - Channel lifetime cancellation, retained until disposal.
     * @returns A credential-free transport whose protocol responses are schema validated.
     * @throws Error for another origin, transport or an already aborted signal.
     * @public
     */
    public async connect(
        endpoint: IRemoteEndpoint,
        signal: AbortSignal,
    ): Promise<IRemoteClientTransport> {
        if (signal.aborted || endpoint.origin !== this._origin || endpoint.transportId !== this.id)
            throw new Error(
                'A browser connection must remain on its selected same-origin transport.',
            );
        const lifetime = new AbortController(),
            stop = () => lifetime.abort();
        signal.addEventListener('abort', stop, { once: true });
        const cleanups = new WeakMap<Response, () => void>();
        const release = (response: Response) => {
            cleanups.get(response)?.();
            cleanups.delete(response);
        };
        const fetchResponse = async (
            path: string,
            method: string,
            body: unknown,
            operation: AbortSignal,
        ): Promise<Response> => {
            normalizeRemotePath(path);
            const joined = new AbortController(),
                cancel = () => joined.abort();
            lifetime.signal.addEventListener('abort', cancel, { once: true });
            operation.addEventListener('abort', cancel, { once: true });
            if (lifetime.signal.aborted || operation.aborted) cancel();
            const cleanup = () => {
                lifetime.signal.removeEventListener('abort', cancel);
                operation.removeEventListener('abort', cancel);
            };
            try {
                const response = await this._options.fetch(`${this._origin}${path}`, {
                    method,
                    credentials: 'same-origin',
                    redirect: 'error',
                    cache: 'no-store',
                    signal: joined.signal,
                    ...(body === undefined
                        ? {}
                        : {
                              headers: { 'content-type': 'application/json' },
                              body: JSON.stringify(body),
                          }),
                });
                cleanups.set(response, cleanup);
                return response;
            } catch (error) {
                cleanup();
                throw error;
            }
        };
        const cancelResponse = async (response: Response) => {
            try {
                await response.body?.cancel();
            } finally {
                release(response);
            }
        };
        const json = async (response: Response): Promise<unknown> => {
            if (!response.ok) {
                await cancelResponse(response);
                throw new Error(`Protocol request failed (${response.status}).`);
            }
            const reader = response.body?.getReader();
            if (!reader) {
                release(response);
                throw new Error('Missing protocol response body.');
            }
            const chunks: Uint8Array[] = [];
            let length = 0;
            try {
                for (;;) {
                    const next = await reader.read();
                    if (next.done) break;
                    length += next.value.byteLength;
                    if (length > (this._options.protocolResponseBytes ?? 65_536))
                        throw new Error('Protocol response exceeds the configured bound.');
                    chunks.push(next.value);
                }
                const bytes = new Uint8Array(length);
                let offset = 0;
                for (const chunk of chunks) {
                    bytes.set(chunk, offset);
                    offset += chunk.length;
                }
                return JSON.parse(
                    new TextDecoder('utf-8', { fatal: true }).decode(bytes),
                ) as unknown;
            } catch (error) {
                await reader.cancel().catch(() => undefined);
                throw error;
            } finally {
                reader.releaseLock();
                release(response);
            }
        };
        return {
            describe: async (operation) =>
                remoteHostDescriptorSchema.parse(
                    await json(await fetchResponse(remoteRoutes.host, 'GET', undefined, operation)),
                ),
            session: async (operation) => {
                const response = await fetchResponse(
                    remoteRoutes.session,
                    'GET',
                    undefined,
                    operation,
                );
                if (response.status === 401) {
                    await cancelResponse(response);
                    return null;
                }
                return remoteSessionDescriptorSchema.parse(await json(response));
            },
            pair: async (bootstrap, deviceName, attemptId, operation) => {
                if (bootstrap.origin !== this._origin)
                    throw new Error('Invitation origin mismatch.');
                const paired = remotePairingResponseSchema.parse(
                    await json(
                        await fetchResponse(
                            remoteRoutes.pairings,
                            'POST',
                            {
                                challenge: bootstrap.challenge,
                                deviceName,
                                attemptId,
                                credentialMode: 'cookie',
                            },
                            operation,
                        ),
                    ),
                );
                if (paired.status === 'paired' && paired.credential !== undefined)
                    throw new Error('A browser must never receive a bearer credential.');
                return paired;
            },
            revoke: async (operation) => {
                const response = await fetchResponse(
                    remoteRoutes.session,
                    'DELETE',
                    undefined,
                    operation,
                );
                try {
                    if (!response.ok) throw new Error('Device revocation failed.');
                } finally {
                    await cancelResponse(response);
                }
            },
            request: (request) => this.request(request, lifetime.signal),
            resourceUrl: (path) => {
                normalizeRemotePath(path);
                return `${this._origin}${path}`;
            },
            dispose: async () => {
                lifetime.abort();
                signal.removeEventListener('abort', stop);
            },
        };
    }
    private async request(
        request: IRemoteByteRequest,
        lifetime: AbortSignal,
    ): Promise<IRemoteByteResponse> {
        normalizeRemotePath(request.path);
        const headers = new Headers(request.headers);
        for (const name of [
            'authorization',
            'cookie',
            'host',
            'origin',
            'connection',
            'forwarded',
            'x-forwarded-for',
            'x-forwarded-host',
        ])
            if (headers.has(name))
                throw new RemoteProtocolError(
                    'forbidden',
                    'Transport authority headers cannot be set by a product request.',
                );
        const controller = new AbortController(),
            cancel = () => controller.abort();
        lifetime.addEventListener('abort', cancel, { once: true });
        request.signal?.addEventListener('abort', cancel, { once: true });
        if (lifetime.aborted || request.signal?.aborted) cancel();
        const cleanup = () => {
            lifetime.removeEventListener('abort', cancel);
            request.signal?.removeEventListener('abort', cancel);
        };
        let response: Response;
        try {
            let body: BodyInit | undefined;
            const streaming = this._options.requestBodyMode === 'streaming-fetch';
            if (request.body && streaming) {
                const iterator = request.body[Symbol.asyncIterator]();
                body = new ReadableStream({
                    async pull(stream) {
                        try {
                            const next = await iterator.next();
                            if (next.done) stream.close();
                            else stream.enqueue(next.value);
                        } catch (error) {
                            stream.error(error);
                        }
                    },
                    async cancel() {
                        await iterator.return?.();
                    },
                });
            } else if (request.body) body = await this.bufferBody(request.body, controller.signal);
            const options: RequestInit & { duplex?: 'half' } = {
                method: request.method,
                headers,
                credentials: 'same-origin',
                redirect: 'error',
                signal: controller.signal,
                ...(body === undefined
                    ? {}
                    : { body, ...(streaming ? { duplex: 'half' as const } : {}) }),
            };
            response = await this._options.fetch(`${this._origin}${request.path}`, options);
        } catch (error) {
            cleanup();
            throw error;
        }
        const reader = response.body?.getReader();
        let released = false;
        const release = () => {
            if (!released) {
                reader?.releaseLock();
                released = true;
            }
            cleanup();
        };
        return {
            status: response.status,
            headers: Object.fromEntries(response.headers),
            body: (async function* () {
                let completed = false;
                try {
                    if (reader)
                        for (;;) {
                            const next = await reader.read();
                            if (next.done) break;
                            yield next.value;
                        }
                    completed = true;
                } finally {
                    try {
                        if (!completed) await reader?.cancel().catch(() => undefined);
                    } finally {
                        release();
                    }
                }
            })(),
            cancel: async () => {
                controller.abort();
                try {
                    if (!released) await reader?.cancel().catch(() => undefined);
                } finally {
                    cleanup();
                }
            },
        };
    }
    private async bufferBody(
        chunks: AsyncIterable<Uint8Array>,
        signal: AbortSignal,
    ): Promise<ArrayBuffer> {
        const maximum = this._options.maximumBufferedRequestBytes ?? 8_388_608;
        if (!Number.isSafeInteger(maximum) || maximum < 1)
            throw new RemoteProtocolError(
                'invalid-request',
                'The buffered request bound must be positive.',
            );
        const iterator = chunks[Symbol.asyncIterator](),
            parts: Uint8Array[] = [];
        let size = 0,
            completed = false;
        let abort: () => void = () => undefined;
        const cancelled = new Promise<never>((_resolve, reject) => {
            abort = () =>
                reject(
                    new RemoteProtocolError(
                        'disposed',
                        'The request body was cancelled before dispatch.',
                    ),
                );
        });
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) abort();
        try {
            for (;;) {
                const next = await Promise.race([iterator.next(), cancelled]);
                if (next.done) {
                    completed = true;
                    break;
                }
                size += next.value.byteLength;
                if (size > maximum)
                    throw new RemoteProtocolError(
                        'resource-limit',
                        'The request body exceeds the HTTP/1 buffer bound before dispatch.',
                    );
                parts.push(new Uint8Array(next.value));
            }
            const bytes = new Uint8Array(size);
            let offset = 0;
            for (const part of parts) {
                bytes.set(part, offset);
                offset += part.byteLength;
            }
            return bytes.buffer;
        } finally {
            signal.removeEventListener('abort', abort);
            if (!completed) void iterator.return?.().catch(() => undefined);
        }
    }
    // #endregion
}
