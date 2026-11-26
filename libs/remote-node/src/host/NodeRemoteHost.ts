// #region Imports
import type { IncomingMessage, ServerResponse, Server } from 'node:http';
import { isIP, type Socket } from 'node:net';
import { randomUUID, createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import {
    isPrivateAddress,
    normalizeRemotePath,
    remoteRoutes,
    remoteHostDescriptorSchema,
    remotePairingRequestSchema,
    remotePairingResponseSchema,
    remoteSessionDescriptorSchema,
    RemoteProtocolError,
    type IRemoteHostDescriptor,
    type IRemotePairingBootstrap,
    type IRemotePrincipal,
    type IRemoteRequestContext,
} from '@pixel-brewery/remote-protocol';
import { RemoteRouteRegistry, type RemoteAccessEvent } from '@pixel-brewery/remote-core';
import { NodeHttpLanTransport } from '../transport/NodeHttpLanTransport.js';
import { selectPrivateHost } from '../transport/selectPrivateHost.js';
import type { INodeRemoteHostOptions } from './interfaces/INodeRemoteHostOptions.js';
import type { IRemoteHostLifecycle } from './interfaces/IRemoteHostLifecycle.js';
import type { IRemoteHostStatus } from './interfaces/IRemoteHostStatus.js';
import type { IRemoteBoundServer } from './interfaces/IRemoteBoundServer.js';
import type { IRemoteActiveRequest } from './interfaces/IRemoteActiveRequest.js';
import type { IRemoteOwnedWebSocket } from './interfaces/IRemoteOwnedWebSocket.js';
import type { IRemotePendingUpgrade } from './interfaces/IRemotePendingUpgrade.js';
// #endregion
const mimeTypes: Readonly<Record<string, string>> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
};
/**
 * Supervised private-LAN host. One application dispatcher owns product validation and authorization.
 * Network, listeners and streams start only through initialize/enable/reconcile and are disposed explicitly.
 *
 * @public
 */
export class NodeRemoteHost implements IRemoteHostLifecycle {
    // #region Fields
    private readonly _registry: RemoteRouteRegistry;
    private readonly _servers: IRemoteBoundServer[] = [];
    private readonly _connections = new Set<Socket>();
    private readonly _requests = new Set<IRemoteActiveRequest>();
    private readonly _sockets = new Map<WebSocket, IRemoteOwnedWebSocket>();
    private readonly _pendingUpgrades = new Set<IRemotePendingUpgrade>();
    private readonly _webSockets = new WebSocketServer({
        noServer: true,
        perMessageDeflate: false,
        maxPayload: 1048576,
    });
    private readonly _cookieName: string;
    private _state: IRemoteHostStatus['state'] = 'disabled';
    private _errorCode: string | undefined;
    private _host: string | undefined;
    private _assetsRoot: string | undefined;
    private _queue: Promise<void> = Promise.resolve();
    private _unsubscribe: (() => void) | undefined;
    private _disposed = false;
    private _halted = false;
    // #endregion
    // #region Ctor
    /**
     * Binds a product adapter and private network policy without starting I/O.
     *
     * @param _options - Application-owned composition, routes and runtime limits for this owner.
     * @public
     */
    public constructor(private readonly _options: INodeRemoteHostOptions) {
        this._registry = new RemoteRouteRegistry(_options.routes);
        this._cookieName =
            _options.cookieName ??
            'pb_remote_' +
                createHash('sha256')
                    .update(`${_options.identity.appId}:${_options.identity.hostId}`)
                    .digest('hex')
                    .slice(0, 20);
        if (!/^[A-Za-z0-9_]{1,100}$/u.test(this._cookieName))
            throw new RemoteProtocolError('invalid-request', 'The session cookie name is invalid.');
    }
    // #endregion
    // #region Properties
    /**
     * Public descriptor. No credential or product snapshot is exposed here.
     *
     * @returns The credential-free public descriptor and currently bound connection origins.
     * @public
     */
    public get descriptor(): IRemoteHostDescriptor {
        return remoteHostDescriptorSchema.parse({
            identity: this._options.identity,
            name: this._options.name,
            protocolVersion: 1,
            endpoints: this._servers.map(({ id, transportId, origin }) => ({
                id,
                transportId,
                origin,
            })),
        });
    }
    // #endregion
    // #region Methods
    /**
     * Restores authorization and immutable asset root, then reconciles persisted activation.
     *
     * @returns Resolves after validated restoration and any requested lifecycle reconciliation.
     * @public
     */
    public initialize(): Promise<void> {
        return this.schedule(async () => {
            this.assertLive();
            await this.initializeAccess();
            if (this._options.access.enabled && !this._halted && this._servers.length === 0)
                await this.start();
        });
    }
    /**
     * Persists activation before starting; unavailable networks retain the user's intent.
     *
     * @returns Resolves after durable activation and successful listener binding.
     * @public
     */
    public enable(): Promise<void> {
        return this.schedule(async () => {
            this.assertLive();
            await this.initializeAccess();
            await this._options.access.setEnabled(true);
            this._halted = false;
            if (!this._servers.length) await this.start();
        });
    }
    /**
     * Closes access first, then persists disabled intent. A failed save keeps this runtime stopped until an explicit enable.
     *
     * @returns Resolves after listeners close and disabled intent is durably stored.
     * @public
     */
    public disable(): Promise<void> {
        return this.schedule(async () => {
            this.assertLive();
            this._halted = true;
            await this.initializeAccess();
            await this.closeServers('stopping');
            try {
                await this._options.access.setEnabled(false);
                this._state = 'disabled';
            } catch (cause) {
                this._state = 'unavailable';
                this._errorCode = 'persistence';
                throw cause;
            }
        });
    }
    /**
     * Serializes network re-evaluation; no-op when the selected interface is unchanged.
     *
     * @returns Resolves after the current selected interface and listener state agree.
     * @public
     */
    public reconcile(): Promise<void> {
        return this.schedule(async () => {
            this.assertLive();
            await this.initializeAccess();
            if (!this._options.access.enabled || this._halted) {
                await this.closeServers(
                    this._errorCode === 'persistence' ? 'unavailable' : 'disabled',
                );
                return;
            }
            let host: string;
            try {
                host = this.resolveHost();
            } catch (cause) {
                await this.closeServers('unavailable');
                this._errorCode = 'network';
                throw cause;
            }
            if (host === this._host && this._servers.length) return;
            await this.closeServers('rebinding');
            await this.start(host);
        });
    }
    /**
     * Returns sanitized network/device state after initialization.
     *
     * @returns A credential-free snapshot of listener and device-administration state.
     * @public
     */
    public status(): IRemoteHostStatus {
        return {
            state: this._state,
            host: this.descriptor,
            access: this._options.access.getStatus(),
            ...(this._errorCode ? { errorCode: this._errorCode } : {}),
        };
    }
    /**
     * Creates an out-of-band challenge for one available endpoint.
     *
     * @param endpointId - Optional endpoint identifier. Omission selects the first available advertised endpoint.
     * @returns The secret-bearing invitation for the selected endpoint. Deliver it out of band and never log it.
     * @public
     */
    public createPairing(endpointId?: string): Promise<IRemotePairingBootstrap> {
        if (this._state !== 'available')
            return Promise.reject(
                new RemoteProtocolError('not-ready', 'Remote access is not available.'),
            );
        const endpoint = endpointId
            ? this._servers.find((server) => server.id === endpointId)
            : this._servers[0];
        if (!endpoint)
            return Promise.reject(
                new RemoteProtocolError('invalid-request', 'The selected endpoint does not exist.'),
            );
        return this._options.access.createPairing(endpoint.origin);
    }
    /**
     * Revokes one device; its active requests and sockets close on the durable change event.
     *
     * @param deviceId - Identifier of the device whose durable grant and owned streams must be revoked.
     * @returns Resolves after durable removal and synchronous revocation notification.
     * @public
     */
    public revokeDevice(deviceId: string): Promise<void> {
        return this._options.access.revokeDevice(deviceId);
    }
    /**
     * Revokes every device without removing the stored activation preference.
     *
     * @returns Resolves after all durable grants are removed and their streams are canceled.
     * @public
     */
    public revokeAllDevices(): Promise<void> {
        return this._options.access.revokeAllDevices();
    }
    /**
     * Observes committed access events of this host's authorization owner.
     *
     * @remarks
     * Delegates to the composed access service, so listeners receive `paired`,
     * `revoked`, `disabled` and `pairings-invalidated` synchronously after each
     * commit. Registrations are independent of the listener lifecycle; release
     * them before or after disposal as the owner requires.
     *
     * @param listener - Synchronous observer; a throwing listener cannot undo the commit.
     * @returns An idempotent cleanup removing only this registration.
     * @public
     */
    public subscribe(listener: (event: RemoteAccessEvent) => void): () => void {
        return this._options.access.subscribe(listener);
    }
    /**
     * Stops resources without clearing durable activation; safe to call repeatedly.
     *
     * @returns Resolves after owned resources close. Repeated calls do not create additional work.
     * @public
     */
    public dispose(): Promise<void> {
        return this.schedule(async () => {
            if (this._disposed) return;
            this._disposed = true;
            await this.closeServers('disposed');
            this._unsubscribe?.();
            this._unsubscribe = undefined;
            await new Promise<void>((complete) => this._webSockets.close(() => complete()));
        });
    }
    private async initializeAccess(): Promise<void> {
        await this._options.access.initialize();
        if (!this._unsubscribe) {
            this._unsubscribe = this._options.access.subscribe((event) => {
                if (event.kind === 'revoked') this.closeDevice(event.deviceId);
                else if (event.kind === 'disabled') this.closeDevice();
            });
        }
        if (this._options.assetsPath && !this._assetsRoot)
            this._assetsRoot = await realpath(this._options.assetsPath);
    }
    private async start(selectedHost?: string): Promise<void> {
        this._state = 'starting';
        this._errorCode = undefined;
        try {
            const host = selectedHost ?? this.resolveHost();
            const transports = this._options.transports ?? [new NodeHttpLanTransport()];
            if (
                transports.length === 0 ||
                transports.length > 8 ||
                new Set(transports.map((transport) => transport.id)).size !== transports.length
            ) {
                throw new RemoteProtocolError(
                    'invalid-request',
                    'The endpoint configuration is invalid.',
                );
            }
            for (const transport of transports) {
                let binding: IRemoteBoundServer | undefined;
                const server = await transport.create((request, response) => {
                    if (!binding) {
                        response.writeHead(503).end();
                        return;
                    }
                    void this.handle(request, response, binding).catch((cause: unknown) =>
                        this.fail(response, cause),
                    );
                });
                const instance: IRemoteBoundServer = {
                    server,
                    id: transport.id,
                    transportId: transport.id,
                    origin: '',
                };
                binding = instance;
                server.maxConnections = this._options.maxConnections ?? 128;
                server.maxRequestsPerSocket = 1000;
                server.headersTimeout = 15000;
                server.requestTimeout = 30000;
                server.keepAliveTimeout = 5000;
                server.on('connection', (socket: Socket) => {
                    this._connections.add(socket);
                    socket.once('close', () => this._connections.delete(socket));
                });
                server.on('upgrade', (request, socket, head) => {
                    void this.upgrade(request, socket, head, instance).catch(() => {
                        socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
                    });
                });
                server.on('tlsRenewalError', () =>
                    this._options.reportFailure?.({
                        operation: 'tls-renewal',
                        code: 'invalid-certificate',
                    }),
                );
                try {
                    const port = await this.listen(server, host);
                    instance.origin = new URL(
                        `${transport.scheme}://${host.includes(':') ? `[${host}]` : host}:${port}`,
                    ).origin;
                    this._servers.push(instance);
                } catch (cause) {
                    server.close();
                    throw cause;
                }
            }
            this._host = host;
            this._state = 'available';
        } catch (cause) {
            await this.closeServers('unavailable');
            this._errorCode = cause instanceof RemoteProtocolError ? cause.code : 'network';
            throw cause instanceof RemoteProtocolError
                ? cause
                : new RemoteProtocolError(
                      'network',
                      'Unable to start the private remote endpoint.',
                  );
        }
    }
    private resolveHost(): string {
        const host = this._options.host ?? selectPrivateHost();
        const loopback = host === '127.0.0.1' || host === '::1';
        if (
            !isIP(host) ||
            (!isPrivateAddress(host) && !(loopback && this._options.allowLoopbackForTests))
        ) {
            throw new RemoteProtocolError(
                'invalid-request',
                'Remote access must bind a supported private interface.',
            );
        }
        return host;
    }
    private async listen(server: Server, host: string): Promise<number> {
        const start = this._options.port ?? 49152;
        const end = this._options.portEnd ?? (start === 0 ? 0 : Math.min(start + 48, 65535));
        if (
            !Number.isInteger(start) ||
            start < 0 ||
            end > 65535 ||
            end < start ||
            (start === 0 && !this._options.allowLoopbackForTests) ||
            end - start > 128
        ) {
            throw new RemoteProtocolError('invalid-request', 'The private port range is invalid.');
        }
        for (let port = start; port <= end; port++) {
            try {
                await new Promise<void>((complete, reject) => {
                    const failed = (cause: Error): void => {
                        server.off('listening', listening);
                        reject(cause);
                    };
                    const listening = (): void => {
                        server.off('error', failed);
                        complete();
                    };
                    server.once('error', failed);
                    server.once('listening', listening);
                    server.listen(port, host);
                });
                const address = server.address();
                if (!address || typeof address === 'string')
                    throw new Error('Missing TCP address.');
                return address.port;
            } catch (cause) {
                if (
                    typeof cause !== 'object' ||
                    cause === null ||
                    !('code' in cause) ||
                    cause.code !== 'EADDRINUSE'
                )
                    throw cause;
            }
        }
        throw new RemoteProtocolError('network', 'No private remote port is available.');
    }
    private async handle(
        request: IncomingMessage,
        response: ServerResponse,
        instance: IRemoteBoundServer,
    ): Promise<void> {
        this.assertRequest(request, instance.origin);
        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Referrer-Policy', 'no-referrer');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        const path = normalizeRemotePath(request.url ?? '');
        const method = request.method ?? '';
        if (path === remoteRoutes.host && method === 'GET') {
            this.json(response, 200, this.descriptor);
            return;
        }
        if (path === remoteRoutes.pairings && method === 'POST') {
            const parsed = remotePairingRequestSchema.safeParse(await this.readJson(request));
            if (!parsed.success)
                throw new RemoteProtocolError('invalid-request', 'The pairing request is invalid.');
            const grant = await this._options.access.completePairing(parsed.data);
            if (grant.status === 'pending') {
                this.json(
                    response,
                    202,
                    remotePairingResponseSchema.parse({
                        status: 'pending',
                        pairingId: grant.pairingId,
                        expiresAt: grant.expiresAt,
                    }),
                );
                return;
            }
            const session = remoteSessionDescriptorSchema.parse({
                host: this.descriptor,
                principal: grant.principal,
            });
            if (parsed.data.credentialMode === 'cookie') {
                response.setHeader(
                    'Set-Cookie',
                    `${this._cookieName}=${encodeURIComponent(grant.credential)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${instance.origin.startsWith('https:') ? '; Secure' : ''}`,
                );
            }
            this.json(
                response,
                200,
                remotePairingResponseSchema.parse({
                    status: 'paired',
                    session,
                    ...(parsed.data.credentialMode === 'bearer'
                        ? { credential: grant.credential }
                        : {}),
                }),
            );
            return;
        }
        if (path === '/__remote' || path.startsWith('/__remote/')) {
            if (path !== remoteRoutes.session || !['GET', 'DELETE'].includes(method)) {
                throw new RemoteProtocolError('forbidden', 'Unknown remote protocol operation.');
            }
            const principal = await this.authorize(request);
            if (method === 'DELETE') {
                await this._options.access.revokeDevice(principal.deviceId);
                response.setHeader(
                    'Set-Cookie',
                    `${this._cookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${instance.origin.startsWith('https:') ? '; Secure' : ''}`,
                );
                response.writeHead(204).end();
            } else
                this.json(
                    response,
                    200,
                    remoteSessionDescriptorSchema.parse({ host: this.descriptor, principal }),
                );
            return;
        }
        let route;
        try {
            route = this._registry.match(method, path);
        } catch (cause) {
            if (this._assetsRoot && ['GET', 'HEAD'].includes(method) && !path.startsWith('/api/')) {
                await this.serveAsset(request, response, path);
                return;
            }
            throw cause;
        }
        if (route.kind === 'websocket')
            throw new RemoteProtocolError(
                'invalid-request',
                'This operation requires a WebSocket upgrade.',
            );
        const principal = await this.authorize(request);
        this._registry.authorize(method, path, principal);
        const context = this.track(request, response, principal, route.id);
        await this._options.application.authorize?.(route, context);
        await this.authorize(request);
        if (context.signal.aborted)
            throw new RemoteProtocolError(
                'unauthorized',
                'The device session was revoked before dispatch.',
            );
        this.limitBody(request, route.maxRequestBytes ?? 4194304);
        await this._options.application.handle(request, response, context);
    }
    private async upgrade(
        request: IncomingMessage,
        socket: import('node:stream').Duplex,
        head: Buffer,
        instance: IRemoteBoundServer,
    ): Promise<void> {
        this.assertRequest(request, instance.origin);
        if (this._sockets.size + this._pendingUpgrades.size >= (this._options.maxWebSockets ?? 64))
            throw new RemoteProtocolError(
                'resource-limit',
                'The event connection limit has been reached.',
            );
        const path = normalizeRemotePath(request.url ?? '');
        const principal = await this.authorize(request);
        const route = this._registry.authorize('GET', path, principal);
        if (route.kind !== 'websocket' || !this._options.application.webSocket)
            throw new RemoteProtocolError('forbidden', 'The event route is not registered.');
        const abort = new AbortController();
        const context: IRemoteRequestContext = {
            requestId: randomUUID(),
            operationId: route.id,
            principal,
            signal: abort.signal,
        };
        const pending: IRemotePendingUpgrade = { deviceId: principal.deviceId, abort, socket };
        this._pendingUpgrades.add(pending);
        const cancelled = () => abort.abort();
        socket.once('close', cancelled);
        try {
            await this._options.application.authorize?.(route, context);
            await this.authorize(request);
            if (abort.signal.aborted)
                throw new RemoteProtocolError(
                    'unauthorized',
                    'The device session was revoked before event dispatch.',
                );
            this._webSockets.handleUpgrade(request, socket, head, (webSocket) => {
                this._sockets.set(webSocket, { deviceId: principal.deviceId, abort });
                webSocket.once('close', () => {
                    this._sockets.delete(webSocket);
                    abort.abort();
                });
                webSocket.on('error', () => {
                    webSocket.terminate();
                });
                void this._options.application.webSocket!(webSocket, context).catch(() =>
                    webSocket.close(1011, 'The event stream failed.'),
                );
            });
        } finally {
            this._pendingUpgrades.delete(pending);
            socket.off('close', cancelled);
        }
    }

    private assertRequest(request: IncomingMessage, origin: string): void {
        if (!origin || this._state !== 'available' || !this._options.access.enabled)
            throw new RemoteProtocolError('not-ready', 'Remote access is not ready.');
        const hostCount = request.rawHeaders.filter(
            (value, index) => index % 2 === 0 && value.toLowerCase() === 'host',
        ).length;
        if (
            hostCount !== 1 ||
            request.headers.host !== new URL(origin).host ||
            (request.headers.origin !== undefined && request.headers.origin !== origin) ||
            (request.headers['sec-fetch-site'] !== undefined &&
                !['same-origin', 'none'].includes(String(request.headers['sec-fetch-site'])))
        ) {
            throw new RemoteProtocolError('forbidden', 'The request origin is not allowed.');
        }
        normalizeRemotePath(request.url ?? '');
    }
    private authorize(request: IncomingMessage): Promise<IRemotePrincipal> {
        const authorization = request.headers.authorization;
        if (authorization !== undefined) {
            if (!/^Bearer [A-Za-z0-9_-]{32,256}$/u.test(authorization))
                throw new RemoteProtocolError('unauthorized', 'The device credential is invalid.');
            return this._options.access.authorize(authorization.slice(7));
        }
        const cookies = (request.headers.cookie ?? '')
            .split(';')
            .map((cookie) => cookie.trim())
            .filter((cookie) => cookie.startsWith(this._cookieName + '='));
        if (cookies.length !== 1)
            throw new RemoteProtocolError('unauthorized', 'A valid device session is required.');
        let token: string;
        try {
            token = decodeURIComponent(cookies[0]!.slice(this._cookieName.length + 1));
        } catch {
            throw new RemoteProtocolError('unauthorized', 'The device cookie is invalid.');
        }
        return this._options.access.authorize(token);
    }
    private track(
        request: IncomingMessage,
        response: ServerResponse,
        principal: IRemotePrincipal,
        operationId: string,
    ): IRemoteRequestContext {
        const active: IRemoteActiveRequest = {
            deviceId: principal.deviceId,
            abort: new AbortController(),
            response,
        };
        this._requests.add(active);
        const cleanup = (): void => {
            this._requests.delete(active);
            active.abort.abort();
            request.off('aborted', cleanup);
        };
        request.once('aborted', cleanup);
        response.once('close', cleanup);
        return { requestId: randomUUID(), operationId, principal, signal: active.abort.signal };
    }
    private limitBody(request: IncomingMessage, maximum: number): void {
        if (!Number.isSafeInteger(maximum) || maximum < 0)
            throw new RemoteProtocolError('invalid-request', 'The product body limit is invalid.');
        const declared = request.headers['content-length'];
        if (declared !== undefined && (!/^\d+$/u.test(declared) || Number(declared) > maximum))
            throw new RemoteProtocolError('resource-limit', 'The request body is too large.');
        // Bytes that arrived during admission are already buffered and count against the quota.
        let received = request.readableLength;
        if (received > maximum)
            throw new RemoteProtocolError('resource-limit', 'The request body is too large.');
        const push = request.push.bind(request);
        // Count where the HTTP parser enters body bytes into the stream. Paused reads, 'data'
        // listeners, pipes and async iteration all consume through this one path, so the quota
        // holds for every consumer without adding a listener or switching the stream mode.
        request.push = (chunk: unknown, encoding?: BufferEncoding): boolean => {
            if (typeof chunk === 'string') received += Buffer.byteLength(chunk, encoding);
            else if (chunk instanceof Uint8Array) received += chunk.byteLength;
            if (received > maximum) {
                request.destroy(
                    new RemoteProtocolError('resource-limit', 'The request body is too large.'),
                );
                return false;
            }
            return push(chunk, encoding);
        };
    }
    private async readJson(request: IncomingMessage): Promise<unknown> {
        if (!/^application\/json(?:;|$)/iu.test(request.headers['content-type'] ?? '')) {
            throw new RemoteProtocolError(
                'invalid-request',
                'The protocol requires a JSON request.',
            );
        }
        let size = 0;
        const chunks: Buffer[] = [];
        for await (const chunk of request) {
            const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
            size += value.byteLength;
            if (size > 16384)
                throw new RemoteProtocolError(
                    'resource-limit',
                    'The pairing request is too large.',
                );
            chunks.push(value);
        }
        try {
            return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
        } catch {
            throw new RemoteProtocolError('invalid-request', 'The request JSON is invalid.');
        }
    }
    private async serveAsset(
        request: IncomingMessage,
        response: ServerResponse,
        path: string,
    ): Promise<void> {
        const root = this._assetsRoot!;
        let candidate = resolve(root, '.' + path);
        try {
            if ((await stat(candidate)).isDirectory()) candidate = resolve(candidate, 'index.html');
            candidate = await realpath(candidate);
        } catch {
            if (extname(path)) {
                response.writeHead(404).end();
                return;
            }
            candidate = await realpath(resolve(root, 'index.html'));
        }
        if (!candidate.startsWith(root + sep))
            throw new RemoteProtocolError(
                'forbidden',
                'The asset is outside the packaged application.',
            );
        const info = await stat(candidate);
        if (!info.isFile()) {
            response.writeHead(404).end();
            return;
        }
        response.setHeader(
            'Content-Security-Policy',
            this._options.contentSecurityPolicy ??
                "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self' data: blob: https:; media-src 'self' blob: https:",
        );
        response.setHeader(
            'Content-Type',
            mimeTypes[extname(candidate)] ?? 'application/octet-stream',
        );
        response.setHeader('Content-Length', info.size);
        if (request.method === 'HEAD') {
            response.writeHead(200).end();
            return;
        }
        const stream = createReadStream(candidate);
        stream.on('error', () => response.destroy());
        response.once('close', () => stream.destroy());
        stream.pipe(response);
    }
    private closeDevice(deviceId?: string): void {
        for (const pending of this._pendingUpgrades)
            if (!deviceId || pending.deviceId === deviceId) {
                pending.abort.abort();
                pending.socket.destroy();
                this._pendingUpgrades.delete(pending);
            }
        for (const active of this._requests)
            if (!deviceId || active.deviceId === deviceId) {
                active.abort.abort();
                active.response.destroy();
                this._requests.delete(active);
            }
        for (const [socket, owned] of this._sockets)
            if (!deviceId || owned.deviceId === deviceId) {
                owned.abort.abort();
                socket.terminate();
                this._sockets.delete(socket);
            }
    }
    private async closeServers(state: IRemoteHostStatus['state']): Promise<void> {
        this._state = state;
        this._options.access.invalidatePendingPairings();
        this.closeDevice();
        const instances = this._servers.splice(0);
        await Promise.all(
            instances.map(
                ({ server }) =>
                    new Promise<void>((complete) => {
                        const timer = setTimeout(() => {
                            for (const socket of this._connections) socket.destroy();
                            complete();
                        }, this._options.shutdownTimeoutMs ?? 1000);
                        server.close(() => {
                            clearTimeout(timer);
                            complete();
                        });
                        server.closeIdleConnections();
                    }),
            ),
        );
        this._host = undefined;
    }
    private json(response: ServerResponse, status: number, value: unknown): void {
        response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
        response.end(JSON.stringify(value));
    }
    private fail(response: ServerResponse, cause: unknown): void {
        const error =
            cause instanceof RemoteProtocolError
                ? cause
                : new RemoteProtocolError('invalid-request', 'The request could not be completed.');
        this._options.reportFailure?.({ operation: 'request', code: error.code });
        if (response.headersSent || response.destroyed) {
            response.destroy();
            return;
        }
        const statuses: Record<string, number> = {
            unauthorized: 401,
            forbidden: 403,
            expired: 410,
            consumed: 409,
            'not-ready': 503,
            incompatible: 409,
            'resource-limit': 413,
            persistence: 503,
            network: 502,
            disposed: 503,
        };
        this.json(response, statuses[error.code] ?? 400, {
            error: { code: error.code, message: error.message },
        });
    }
    private assertLive(): void {
        if (this._disposed)
            throw new RemoteProtocolError('disposed', 'The remote host has been disposed.');
    }
    private schedule<T>(operation: () => Promise<T>): Promise<T> {
        const result = this._queue.then(operation);
        this._queue = result.then(
            () => undefined,
            () => undefined,
        );
        return result;
    }
    // #endregion
}
