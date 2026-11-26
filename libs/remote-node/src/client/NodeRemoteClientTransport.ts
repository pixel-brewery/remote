// #region Imports
import { request as httpRequest, type ClientRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import type { IRemoteClientTransport } from '@pixel-brewery/remote-client';
import {
    normalizeRemotePath,
    remoteRoutes,
    remoteHostDescriptorSchema,
    remoteSessionDescriptorSchema,
    remotePairingBootstrapSchema,
    remotePairingRequestSchema,
    remotePairingResponseSchema,
    remoteErrorResponseSchema,
    RemoteProtocolError,
    type IRemoteByteRequest,
    type IRemoteByteResponse,
    type IRemoteEndpoint,
    type IRemoteHostDescriptor,
    type IRemotePairingBootstrap,
    type IRemotePairingResponse,
    type IRemoteSessionDescriptor,
} from '@pixel-brewery/remote-protocol';
import { RemoteRouteRegistry } from '@pixel-brewery/remote-core';
import type { INodeRemoteConnectorOptions } from './interfaces/INodeRemoteConnectorOptions.js';
import { validatePrivateRemoteEndpoint } from './validatePrivateRemoteEndpoint.js';
// #endregion
const forbiddenHeaders = new Set([
    'authorization',
    'cookie',
    'host',
    'origin',
    'connection',
    'upgrade',
    'proxy-authorization',
    'proxy-connection',
    'transfer-encoding',
    'te',
    'trailer',
    'keep-alive',
    'content-length',
    'forwarded',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-forwarded-port',
    'x-real-ip',
]);
const privateResponseHeaders = new Set([
    'set-cookie',
    'set-cookie2',
    'connection',
    'transfer-encoding',
    'upgrade',
    'keep-alive',
    'proxy-authenticate',
]);
/**
 * Streaming Node channel. Bearer credentials never leave this privileged object.
 *
 * @public
 */
export class NodeRemoteClientTransport implements IRemoteClientTransport {
    // #region Fields
    private readonly _registry: RemoteRouteRegistry;
    private readonly _controller = new AbortController();
    private readonly _active = new Set<AbortController>();
    private readonly _webSockets = new Set<WebSocket>();
    private _verified = false;
    private _disposed = false;
    private _describing: Promise<IRemoteHostDescriptor> | undefined;
    private readonly _abortOwner: () => void;
    // #endregion
    // #region Ctor
    /**
     * Created by NodeRemoteConnector after destination-policy validation.
     *
     * @param _endpoint - Previously validated numeric private peer and its transport identifier.
     * @param _options - Application-owned composition, routes and runtime limits for this owner.
     * @param _ownerSignal - Connection lifetime signal. Aborting it disposes requests and event streams.
     * @public
     */
    public constructor(
        private readonly _endpoint: IRemoteEndpoint,
        private readonly _options: INodeRemoteConnectorOptions,
        private readonly _ownerSignal: AbortSignal,
    ) {
        this._endpoint = validatePrivateRemoteEndpoint(_endpoint, _options);
        this._registry = new RemoteRouteRegistry(_options.routes);
        this._abortOwner = () => {
            void this.dispose();
        };
        _ownerSignal.addEventListener('abort', this._abortOwner, { once: true });
        if (_ownerSignal.aborted) this._controller.abort();
    }
    // #endregion
    // #region Methods
    /**
     * Verifies public app/installation identity before credentials may be read or sent.
     *
     * @param signal - Cancellation signal for this operation; cancellation never rolls back an application mutation already admitted by the host.
     * @returns The validated public descriptor for the expected application and installation.
     * @public
     */
    public describe(signal: AbortSignal): Promise<IRemoteHostDescriptor> {
        this.assertLive(signal);
        if (!this._describing) {
            const pending = this.describeHost(signal);
            this._describing = pending;
            void pending.catch(() => {
                if (this._describing === pending) this._describing = undefined;
            });
        }
        return this._describing;
    }
    /**
     * Restores only this app/installation credential; 401 clears its stale local secret.
     *
     * @param signal - Cancellation signal for this operation; cancellation never rolls back an application mutation already admitted by the host.
     * @returns The restored device session, or null when no usable credential is available.
     * @public
     */
    public async session(signal: AbortSignal): Promise<IRemoteSessionDescriptor | null> {
        await this.describe(signal);
        const credential = await this._options.credentialStore.get(this._options.expectedIdentity);
        this.assertLive(signal);
        if (!credential) return null;
        const response = await this.send(
            { method: 'GET', path: remoteRoutes.session, signal },
            credential,
        );
        if (response.status === 401) {
            await response.cancel();
            await this._options.credentialStore.delete(this._options.expectedIdentity);
            return null;
        }
        const session = remoteSessionDescriptorSchema.safeParse(await this.readJson(response));
        if (!session.success)
            throw new RemoteProtocolError('incompatible', 'The host session response is invalid.');
        this.assertIdentity(session.data.host);
        this.assertPrincipal(session.data);
        return session.data;
    }
    /**
     * Completes the same host-bound attempt and stores its bearer privately before reporting success.
     *
     * @param input - Untrusted input validated by the canonical contract before use.
     * @param deviceName - Trimmed human-readable device label bound to this pairing attempt.
     * @param attemptId - Stable client attempt identifier reused unchanged after uncertain pairing responses.
     * @param signal - Cancellation signal for this operation; cancellation never rolls back an application mutation already admitted by the host.
     * @returns A pending approval or credential-free paired result, after native credential storage succeeds.
     * @remarks Retrying the same attempt recovers an uncertain response. The bearer is stored through the protected credential port and removed from the returned descriptor.
     * @throws RemoteProtocolError for a foreign invitation, host rejection, cancellation or protected-storage failure.
     * @public
     */
    public async pair(
        input: IRemotePairingBootstrap,
        deviceName: string,
        attemptId: string,
        signal: AbortSignal,
    ): Promise<IRemotePairingResponse> {
        await this.describe(signal);
        const bootstrap = remotePairingBootstrapSchema.safeParse(input);
        if (
            !bootstrap.success ||
            bootstrap.data.appId !== this._options.expectedIdentity.appId ||
            bootstrap.data.hostId !== this._options.expectedIdentity.hostId ||
            bootstrap.data.origin !== this._endpoint.origin ||
            Date.parse(bootstrap.data.expiresAt) <= Date.now()
        ) {
            throw new RemoteProtocolError(
                'invalid-request',
                'The invitation does not belong to this active host.',
            );
        }
        const request = remotePairingRequestSchema.parse({
            attemptId,
            deviceName,
            challenge: bootstrap.data.challenge,
            credentialMode: 'bearer',
        });
        const bytes = new TextEncoder().encode(JSON.stringify(request));
        const response = await this.send({
            method: 'POST',
            path: remoteRoutes.pairings,
            signal,
            headers: { 'content-type': 'application/json' },
            body: (async function* () {
                yield bytes;
            })(),
        });
        const paired = remotePairingResponseSchema.safeParse(await this.readJson(response));
        if (!paired.success)
            throw new RemoteProtocolError('incompatible', 'The host pairing response is invalid.');
        if (paired.data.status === 'pending') return paired.data;
        this.assertIdentity(paired.data.session.host);
        this.assertPrincipal(paired.data.session);
        if (!paired.data.credential)
            throw new RemoteProtocolError(
                'incompatible',
                'The host did not issue a native device credential.',
            );
        this.assertLive(signal);
        try {
            await this._options.credentialStore.set(
                this._options.expectedIdentity,
                paired.data.credential,
            );
        } catch {
            throw new RemoteProtocolError(
                'persistence',
                'The paired device credential could not be protected. Retry the same pairing attempt.',
            );
        }
        this.assertLive(signal);
        return { status: 'paired', session: paired.data.session };
    }
    /**
     * Durably revokes this device; local deletion occurs only after the host accepts revocation.
     *
     * @param signal - Cancellation signal for this operation; cancellation never rolls back an application mutation already admitted by the host.
     * @returns Resolves after host revocation and the corresponding local credential deletion.
     * @public
     */
    public async revoke(signal: AbortSignal): Promise<void> {
        const credential = await this.credential(signal);
        const response = await this.send(
            { method: 'DELETE', path: remoteRoutes.session, signal },
            credential,
        );
        if (response.status !== 204 && response.status !== 401) await this.readJson(response);
        await response.cancel();
        await this._options.credentialStore.delete(this._options.expectedIdentity);
    }
    /**
     * Dispatches one admitted request with byte-stream backpressure and no redirect or write replay.
     *
     * @param request - Original or portable HTTP request. Streaming bodies remain owned by the caller until consumed or canceled.
     * @returns A streamed response. Consume its body or call cancel to release the connection.
     * @remarks Requests are sent once. A disconnect after accepting a mutation does not establish whether its business effect completed.
     * @throws RemoteProtocolError for an unregistered route, protected header, bound violation, redirect or unavailable connection.
     * @public
     */
    public async request(request: IRemoteByteRequest): Promise<IRemoteByteResponse> {
        const route = this._registry.match(request.method, request.path);
        if (route.kind === 'websocket')
            throw new RemoteProtocolError(
                'invalid-request',
                'Use the event-stream connection for this operation.',
            );
        const signal = request.signal ?? this._controller.signal;
        return this.send(request, await this.credential(signal), route.maxRequestBytes ?? 4194304);
    }
    /**
     * Resolves an admitted read path without including a credential.
     *
     * @param path - Origin-form request target whose path is admitted by the route registry; queries are preserved by transports.
     * @returns An admitted resource address without any credential in its path or query.
     * @public
     */
    public resourceUrl(path: string): string {
        this.assertLive();
        normalizeRemotePath(path);
        const route = this._registry.match('GET', path);
        if (route.kind === 'websocket')
            throw new RemoteProtocolError(
                'forbidden',
                'A WebSocket is not an embeddable resource.',
            );
        return this._endpoint.origin + path;
    }
    /**
     * Opens one registered authenticated WebSocket; callers own message-level product validation.
     *
     * @param path - Origin-form request target whose path is admitted by the route registry; queries are preserved by transports.
     * @param signal - Cancellation signal for this operation; cancellation never rolls back an application mutation already admitted by the host.
     * @returns The open owned socket. Close it when the consuming view no longer needs the event stream.
     * @public
     */
    public async openWebSocket(path: string, signal: AbortSignal): Promise<WebSocket> {
        normalizeRemotePath(path);
        if (this._registry.match('GET', path).kind !== 'websocket')
            throw new RemoteProtocolError('forbidden', 'This event route is not registered.');
        if (this._webSockets.size >= (this._options.maxConcurrentRequests ?? 64))
            throw new RemoteProtocolError(
                'resource-limit',
                'Too many remote event streams are active.',
            );
        const token = await this.credential(signal);
        this.assertLive(signal);
        const url = new URL(path, this._endpoint.origin);
        url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(url, {
            headers: { authorization: 'Bearer ' + token },
            followRedirects: false,
            maxPayload: 1048576,
            perMessageDeflate: false,
            handshakeTimeout: this._options.requestTimeoutMs ?? 15000,
            ...(this._options.certificateAuthority
                ? { ca: this._options.certificateAuthority }
                : {}),
        });
        this._webSockets.add(socket);
        const abort = () => socket.terminate();
        signal.addEventListener('abort', abort, { once: true });
        socket.once('close', () => {
            signal.removeEventListener('abort', abort);
            this._webSockets.delete(socket);
        });
        socket.on('error', () => socket.terminate());
        try {
            await once(socket, 'open', { signal });
            this.assertLive(signal);
            return socket;
        } catch {
            socket.terminate();
            throw new RemoteProtocolError(
                'network',
                'The remote event stream could not be opened.',
            );
        }
    }
    /**
     * Aborts pending requests and event streams; no durable device grant is deleted.
     *
     * @returns Resolves after owned resources close. Repeated calls do not create additional work.
     * @public
     */
    public async dispose(): Promise<void> {
        if (this._disposed) return;
        this._disposed = true;
        this._controller.abort();
        this._ownerSignal.removeEventListener('abort', this._abortOwner);
        for (const active of this._active) active.abort();
        for (const socket of this._webSockets) socket.terminate();
        this._active.clear();
        this._webSockets.clear();
    }
    private async describeHost(signal: AbortSignal): Promise<IRemoteHostDescriptor> {
        const response = await this.send({ method: 'GET', path: remoteRoutes.host, signal });
        const host = remoteHostDescriptorSchema.safeParse(await this.readJson(response));
        if (!host.success)
            throw new RemoteProtocolError('incompatible', 'The remote host descriptor is invalid.');
        this.assertIdentity(host.data);
        this._verified = true;
        return host.data;
    }
    private assertIdentity(host: IRemoteHostDescriptor): void {
        if (
            host.identity.appId !== this._options.expectedIdentity.appId ||
            host.identity.hostId !== this._options.expectedIdentity.hostId ||
            !host.endpoints.some(
                (endpoint) =>
                    endpoint.origin === this._endpoint.origin &&
                    endpoint.transportId === this._endpoint.transportId,
            )
        ) {
            throw new RemoteProtocolError(
                'incompatible',
                'The endpoint belongs to a different application or installation.',
            );
        }
    }
    private assertPrincipal(session: IRemoteSessionDescriptor): void {
        if (
            session.principal.appId !== this._options.expectedIdentity.appId ||
            session.principal.hostId !== this._options.expectedIdentity.hostId
        ) {
            throw new RemoteProtocolError(
                'incompatible',
                'The session belongs to a different application or installation.',
            );
        }
    }
    private async credential(signal: AbortSignal): Promise<string> {
        await this.describe(signal);
        this.assertLive(signal);
        if (!this._verified)
            throw new RemoteProtocolError(
                'incompatible',
                'The host identity has not been verified.',
            );
        const credential = await this._options.credentialStore.get(this._options.expectedIdentity);
        this.assertLive(signal);
        if (!credential || !/^[A-Za-z0-9_-]{32,256}$/u.test(credential))
            throw new RemoteProtocolError(
                'unauthorized',
                'Pair this device before requesting application operations.',
            );
        return credential;
    }
    private async send(
        input: IRemoteByteRequest,
        credential?: string,
        maximum = 16384,
    ): Promise<IRemoteByteResponse> {
        this.assertLive(input.signal);
        normalizeRemotePath(input.path);
        if (this._active.size >= (this._options.maxConcurrentRequests ?? 64))
            throw new RemoteProtocolError('resource-limit', 'Too many remote requests are active.');
        const headers: Record<string, string> = {};
        for (const [name, value] of Object.entries(input.headers ?? {})) {
            if (
                !/^[a-z0-9!#$%&'*+.^_`|~-]+$/iu.test(name) ||
                /[\x00-\x1f\x7f]/u.test(value) ||
                forbiddenHeaders.has(name.toLowerCase()) ||
                name.toLowerCase().startsWith('sec-')
            ) {
                throw new RemoteProtocolError(
                    'forbidden',
                    'The request attempts to supply a protected transport header.',
                );
            }
            headers[name.toLowerCase()] = value;
        }
        if (credential) headers.authorization = 'Bearer ' + credential;
        const controller = new AbortController();
        this._active.add(controller);
        const abort = () => controller.abort();
        input.signal?.addEventListener('abort', abort, { once: true });
        this._controller.signal.addEventListener('abort', abort, { once: true });
        const cleanup = () => {
            this._active.delete(controller);
            input.signal?.removeEventListener('abort', abort);
            this._controller.signal.removeEventListener('abort', abort);
        };
        const url = new URL(input.path, this._endpoint.origin);
        if (url.origin !== this._endpoint.origin) {
            cleanup();
            throw new RemoteProtocolError(
                'forbidden',
                'A request cannot change its selected peer.',
            );
        }
        let outgoing: ClientRequest | undefined;
        try {
            const response = await new Promise<IncomingMessage>((complete, reject) => {
                outgoing = (url.protocol === 'https:' ? httpsRequest : httpRequest)(
                    url,
                    {
                        method: input.method,
                        headers,
                        signal: controller.signal,
                        agent: false,
                        ...(this._options.certificateAuthority
                            ? { ca: this._options.certificateAuthority }
                            : {}),
                    },
                    complete,
                );
                const deadline = setTimeout(() => {
                    outgoing?.destroy(new Error('Remote response deadline reached.'));
                }, this._options.requestTimeoutMs ?? 15000);
                outgoing.once('response', () => clearTimeout(deadline));
                outgoing.once('error', (cause) => {
                    clearTimeout(deadline);
                    reject(cause);
                });
                void (async () => {
                    try {
                        let bytes = 0;
                        if (input.body)
                            for await (const chunk of input.body) {
                                if (!(chunk instanceof Uint8Array))
                                    throw new RemoteProtocolError(
                                        'invalid-request',
                                        'The request body must contain byte chunks.',
                                    );
                                bytes += chunk.byteLength;
                                if (bytes > maximum)
                                    throw new RemoteProtocolError(
                                        'resource-limit',
                                        'The request body exceeds its registered limit.',
                                    );
                                if (!outgoing!.write(chunk))
                                    await once(outgoing!, 'drain', { signal: controller.signal });
                            }
                        outgoing!.end();
                    } catch (cause) {
                        outgoing!.destroy(
                            cause instanceof Error ? cause : new Error('The request body failed.'),
                        );
                    }
                })();
            });
            const status = response.statusCode ?? 502;
            if (status >= 300 && status < 400 && status !== 304) {
                response.destroy();
                throw new RemoteProtocolError('forbidden', 'Remote redirects are not permitted.');
            }
            const responseHeaders: Record<string, string> = {};
            const connectionHeaders = new Set(
                String(response.headers.connection ?? '')
                    .toLowerCase()
                    .split(',')
                    .map((value) => value.trim()),
            );
            for (const [key, value] of Object.entries(response.headers))
                if (
                    value !== undefined &&
                    !privateResponseHeaders.has(key) &&
                    !connectionHeaders.has(key)
                ) {
                    responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
                }
            response.on('error', () => {
                /* The body iterator reports the sanitized transport failure. */
            });
            response.once('close', cleanup);
            return {
                status,
                headers: responseHeaders,
                body: (async function* () {
                    try {
                        for await (const chunk of response)
                            yield Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
                    } finally {
                        response.destroy();
                        cleanup();
                    }
                })(),
                cancel: async () => {
                    controller.abort();
                    response.destroy();
                    cleanup();
                },
            };
        } catch (cause) {
            outgoing?.destroy();
            cleanup();
            if (cause instanceof RemoteProtocolError) throw cause;
            throw new RemoteProtocolError(
                !['GET', 'HEAD'].includes(input.method) && outgoing?.headersSent
                    ? 'unknown-outcome'
                    : 'network',
                'The selected remote peer could not complete this request.',
            );
        }
    }
    private async readJson(response: IRemoteByteResponse): Promise<unknown> {
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        const deadline = setTimeout(() => {
            void response.cancel();
        }, this._options.requestTimeoutMs ?? 15_000);
        try {
            for await (const chunk of response.body) {
                bytes += chunk.byteLength;
                if (bytes > 65536)
                    throw new RemoteProtocolError(
                        'resource-limit',
                        'The protocol response exceeds its limit.',
                    );
                chunks.push(chunk);
            }
            let value: unknown;
            try {
                value = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
            } catch {
                throw new RemoteProtocolError(
                    'incompatible',
                    'The host returned an invalid protocol response.',
                );
            }
            if (response.status >= 400) {
                const error = remoteErrorResponseSchema.safeParse(value);
                throw new RemoteProtocolError(
                    error.success ? error.data.error.code : 'network',
                    'The host rejected this remote operation.',
                );
            }
            return value;
        } catch (cause) {
            if (cause instanceof RemoteProtocolError) throw cause;
            throw new RemoteProtocolError(
                'network',
                'The host protocol response ended before completion.',
            );
        } finally {
            clearTimeout(deadline);
            await response.cancel();
        }
    }
    private assertLive(signal?: AbortSignal): void {
        if (this._disposed || this._controller.signal.aborted || signal?.aborted)
            throw new RemoteProtocolError('disposed', 'The remote connection is closed.');
    }
    // #endregion
}
