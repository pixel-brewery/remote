// #region Imports
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { once } from 'node:events';
import type { Socket } from 'node:net';
import type { Duplex } from 'node:stream';
import { WebSocket, WebSocketServer } from 'ws';
import {
    normalizeRemotePath,
    remoteContentPolicySchema,
    type IRemoteContentPolicy,
    remoteRoutes,
    remoteHostDescriptorSchema,
    remoteSessionDescriptorSchema,
    RemoteProtocolError,
    type IRemoteByteResponse,
} from '@pixel-brewery/remote-protocol';
import { RemoteRouteRegistry } from '@pixel-brewery/remote-core';
import type { INodeLocalGatewayOptions } from './interfaces/INodeLocalGatewayOptions.js';
import type { IRemoteLocalGatewayView } from './interfaces/IRemoteLocalGatewayView.js';
// #endregion
const contentTypes: Readonly<Record<string, string>> = {
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
const omittedRequestHeaders = new Set([
    'cookie',
    'host',
    'origin',
    'referer',
    'connection',
    'upgrade',
    'accept-encoding',
    'content-length',
    'transfer-encoding',
    'authorization',
    'proxy-authorization',
    'proxy-connection',
    'te',
    'trailer',
    'keep-alive',
    'forwarded',
    'x-forwarded-for',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-forwarded-port',
    'x-real-ip',
]);
const omittedResponseHeaders = new Set([
    'set-cookie',
    'connection',
    'transfer-encoding',
    'upgrade',
    'keep-alive',
    'content-security-policy',
    'content-security-policy-report-only',
    'access-control-allow-origin',
    'access-control-allow-credentials',
]);
const activeFetchDestinations = new Set([
    'script',
    'style',
    'worker',
    'sharedworker',
    'serviceworker',
    'document',
    'iframe',
    'object',
    'embed',
]);
/**
 * Loopback-only view server. Native assets execute locally; admitted application bytes flow to one owned peer.
 *
 * @public
 */
export class NodeLocalGateway {
    // #region Fields
    private readonly _registry: RemoteRouteRegistry;
    private readonly _contentPolicy: IRemoteContentPolicy;
    private readonly _cookieName = 'pb_remote_view_' + randomBytes(12).toString('hex');
    private readonly _cookieValue = randomBytes(32).toString('base64url');
    private readonly _sockets = new Set<Socket>();
    private readonly _requests = new Set<AbortController>();
    private readonly _webSockets = new Set<WebSocket>();
    private readonly _upgrades = new WebSocketServer({
        noServer: true,
        maxPayload: 1048576,
        perMessageDeflate: false,
    });
    private _server: Server | undefined;
    private _root: string | undefined;
    private _view: IRemoteLocalGatewayView | undefined;
    private _starting: Promise<IRemoteLocalGatewayView> | undefined;
    private _disposed = false;
    private _disposal: Promise<void> | undefined;
    // #endregion
    // #region Ctor
    /**
     * Composes a packaged view with a privileged transport. No listener or file access starts here.
     *
     * @param _options - Application-owned composition, routes and runtime limits for this owner.
     * @public
     */
    public constructor(private readonly _options: INodeLocalGatewayOptions) {
        this._registry = new RemoteRouteRegistry(_options.routes);
        this._contentPolicy = remoteContentPolicySchema.parse(_options.contentPolicy ?? {});
    }
    // #endregion
    // #region Methods
    /**
     * Starts one ephemeral IPv4 loopback listener and returns a native-only cookie installation descriptor.
     *
     * @returns The native-only local-view descriptor. Install its cookie before navigating and omit the cookie from renderer state.
     * @remarks Only 127.0.0.1 is bound. The cookie is a distinct ephemeral capability installed by native code, never the remote device bearer.
     * @throws RemoteProtocolError or a filesystem error when packaged assets or the loopback listener are unavailable.
     * @public
     */
    public start(): Promise<IRemoteLocalGatewayView> {
        if (this._disposed)
            return Promise.reject(new RemoteProtocolError('disposed', 'The local view is closed.'));
        if (this._view) return Promise.resolve(this._view);
        if (!this._starting) {
            this._starting = this.startServer();
            void this._starting.catch(() => {
                this._starting = undefined;
            });
        }
        return this._starting;
    }
    /**
     * Cancels forwarding, closes local views and releases all sockets. It does not revoke the device.
     *
     * @returns Resolves after owned resources close. Repeated calls do not create additional work.
     * @public
     */
    public dispose(): Promise<void> {
        if (!this._disposal) {
            this._disposed = true;
            this._disposal = Promise.resolve().then(() => this.shutdown());
        }
        return this._disposal;
    }

    private async shutdown(): Promise<void> {
        if (this._starting) {
            try {
                await this._starting;
            } catch {
                /* Failed startup has no active view. */
            }
        }
        for (const request of this._requests) request.abort();
        for (const socket of this._webSockets) socket.terminate();
        const server = this._server;
        this._server = undefined;
        this._view = undefined;
        if (server)
            await new Promise<void>((complete) => {
                const timer = setTimeout(() => {
                    for (const socket of this._sockets) socket.destroy();
                    complete();
                }, this._options.shutdownTimeoutMs ?? 1000);
                server.close(() => {
                    clearTimeout(timer);
                    complete();
                });
                server.closeIdleConnections();
            });
        await new Promise<void>((complete) => this._upgrades.close(() => complete()));
    }

    private async startServer(): Promise<IRemoteLocalGatewayView> {
        this._root = await realpath(this._options.assetsPath);
        if (!(await stat(this._root)).isDirectory())
            throw new RemoteProtocolError('invalid-request', 'The packaged view root is invalid.');
        if (this._disposed) throw new RemoteProtocolError('disposed', 'The local view is closed.');
        const server = createServer((request, response) => {
            void this.handle(request, response).catch((cause: unknown) =>
                this.fail(response, cause),
            );
        });
        this._server = server;
        server.maxConnections = this._options.maxConnections ?? 64;
        server.maxRequestsPerSocket = 1000;
        server.headersTimeout = 15000;
        server.requestTimeout = 30000;
        server.keepAliveTimeout = 5000;
        server.on('connection', (socket: Socket) => {
            this._sockets.add(socket);
            socket.once('close', () => this._sockets.delete(socket));
        });
        server.on('upgrade', (request, socket, head) => {
            void this.upgrade(request, socket, head).catch(() =>
                socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'),
            );
        });
        await new Promise<void>((complete, reject) => {
            server.once('error', reject);
            server.listen(0, '127.0.0.1', () => {
                server.off('error', reject);
                complete();
            });
        });
        const address = server.address();
        if (!address || typeof address === 'string')
            throw new RemoteProtocolError(
                'network',
                'The local view did not acquire a loopback port.',
            );
        this._view = {
            connectionId: this._options.connectionId,
            identity: this._options.identity,
            origin: `http://127.0.0.1:${address.port}`,
            cookie: {
                name: this._cookieName,
                value: this._cookieValue,
                path: '/',
                httpOnly: true,
                sameSite: 'strict',
                secure: false,
            },
        };
        return this._view;
    }
    private authorize(request: IncomingMessage): void {
        const view = this._view;
        if (this._disposed || !view)
            throw new RemoteProtocolError('disposed', 'The local view is closed.');
        const hostCount = request.rawHeaders.filter(
            (value, index) => index % 2 === 0 && value.toLowerCase() === 'host',
        ).length;
        if (
            hostCount !== 1 ||
            request.headers.host !== new URL(view.origin).host ||
            (request.headers.origin !== undefined && request.headers.origin !== view.origin) ||
            (request.headers['sec-fetch-site'] !== undefined &&
                !['same-origin', 'none'].includes(String(request.headers['sec-fetch-site']))) ||
            request.headers.authorization !== undefined
        )
            throw new RemoteProtocolError('forbidden', 'The local caller is not allowed.');
        normalizeRemotePath(request.url ?? '');
        const cookies = (request.headers.cookie ?? '')
            .split(';')
            .map((value) => value.trim())
            .filter((value) => value.startsWith(this._cookieName + '='));
        const value = cookies.length === 1 ? cookies[0]!.slice(this._cookieName.length + 1) : '';
        const actual = Buffer.from(value);
        const expected = Buffer.from(this._cookieValue);
        if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
            throw new RemoteProtocolError(
                'unauthorized',
                'The local view requires its native session.',
            );
    }
    private async handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
        this.authorize(request);
        response.setHeader('Referrer-Policy', 'no-referrer');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('Cache-Control', 'no-store');
        const path = request.url!;
        const canonical = normalizeRemotePath(path);
        const method = request.method ?? '';
        if (
            (canonical === remoteRoutes.host && method === 'GET') ||
            (canonical === remoteRoutes.session && ['GET', 'DELETE'].includes(method))
        ) {
            await this.control(request, response, canonical);
            return;
        }
        let route;
        try {
            route = this._registry.match(method, path);
        } catch (cause) {
            if (
                canonical.startsWith('/__remote') ||
                canonical === '/api' ||
                canonical.startsWith('/api/') ||
                !['GET', 'HEAD'].includes(method)
            )
                throw cause;
            await this.asset(canonical, request, response);
            return;
        }
        if (route.kind === 'websocket')
            throw new RemoteProtocolError(
                'invalid-request',
                'This operation requires a WebSocket.',
            );
        if (
            activeFetchDestinations.has(
                String(request.headers['sec-fetch-dest'] ?? '').toLowerCase(),
            )
        )
            throw new RemoteProtocolError(
                'forbidden',
                'Remote application responses cannot supply executable native-view resources.',
            );
        if (this._requests.size >= (this._options.maxConcurrentRequests ?? 64))
            throw new RemoteProtocolError('resource-limit', 'Too many local requests are active.');
        const abort = new AbortController();
        this._requests.add(abort);
        const cancelled = () => abort.abort();
        request.once('aborted', cancelled);
        response.once('close', cancelled);
        const headers: Record<string, string> = {};
        const connectionHeaders = new Set(
            String(request.headers.connection ?? '')
                .toLowerCase()
                .split(',')
                .map((value) => value.trim()),
        );
        for (const [key, value] of Object.entries(request.headers))
            if (
                value !== undefined &&
                !omittedRequestHeaders.has(key) &&
                !connectionHeaders.has(key) &&
                !key.startsWith('sec-')
            )
                headers[key] = Array.isArray(value) ? value.join(', ') : value;
        let upstream: IRemoteByteResponse | undefined;
        try {
            const maximum = route.maxRequestBytes ?? 4194304;
            const declared = request.headers['content-length'];
            if (declared !== undefined && (!/^\d+$/u.test(declared) || Number(declared) > maximum))
                throw new RemoteProtocolError(
                    'resource-limit',
                    'The local request exceeds its registered limit.',
                );
            const body = async function* (): AsyncGenerator<Uint8Array> {
                let bytes = 0;
                for await (const chunk of request) {
                    const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
                    bytes += data.byteLength;
                    if (bytes > maximum)
                        throw new RemoteProtocolError(
                            'resource-limit',
                            'The local request exceeds its registered limit.',
                        );
                    yield data;
                }
            };
            upstream = await this._options.transport.request({
                method,
                path,
                headers,
                signal: abort.signal,
                ...(!['GET', 'HEAD'].includes(method) ? { body: body() } : {}),
            });
            if (upstream.status >= 300 && upstream.status < 400 && upstream.status !== 304)
                throw new RemoteProtocolError('forbidden', 'Remote redirects are not permitted.');
            const mediaType =
                upstream.headers['content-type']?.split(';')[0]?.trim().toLowerCase() ??
                'application/octet-stream';
            if (/(?:javascript|ecmascript|html|svg\+xml)/u.test(mediaType))
                throw new RemoteProtocolError(
                    'forbidden',
                    'Remote executable content cannot run inside the native view.',
                );
            for (const [key, value] of Object.entries(upstream.headers))
                if (!omittedResponseHeaders.has(key.toLowerCase())) response.setHeader(key, value);
            response.setHeader(
                'Content-Security-Policy',
                "sandbox; default-src 'none'; frame-ancestors 'none'",
            );
            response.writeHead(upstream.status);
            if (method !== 'HEAD')
                for await (const chunk of upstream.body) {
                    if (abort.signal.aborted) break;
                    if (!response.write(chunk))
                        await once(response, 'drain', { signal: abort.signal });
                }
            response.end();
        } finally {
            await upstream?.cancel();
            this._requests.delete(abort);
            request.off('aborted', cancelled);
            response.off('close', cancelled);
        }
    }
    private async asset(
        path: string,
        request: IncomingMessage,
        response: ServerResponse,
    ): Promise<void> {
        const root = this._root!;
        let file = resolve(root, '.' + path);
        try {
            if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
            file = await realpath(file);
        } catch {
            if (extname(path)) {
                response.writeHead(404).end();
                return;
            }
            file = await realpath(resolve(root, 'index.html'));
        }
        if (!file.startsWith(root + sep) || !(await stat(file)).isFile())
            throw new RemoteProtocolError(
                'forbidden',
                'The requested asset is outside the packaged application.',
            );
        response.setHeader(
            'Content-Security-Policy',
            `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; img-src 'self' data: blob:${this._contentPolicy.allowHttpsImages === true ? ' https:' : ''}; media-src 'self' blob:${this._contentPolicy.allowHttpsMedia === true ? ' https:' : ''}; connect-src 'self'${this._contentPolicy.allowHttpsConnections === true ? ' https:' : ''}`,
        );
        response.setHeader(
            'Content-Type',
            contentTypes[extname(file)] ?? 'application/octet-stream',
        );
        response.setHeader('Content-Length', (await stat(file)).size);
        if (request.method === 'HEAD') {
            response.end();
            return;
        }
        const stream = createReadStream(file);
        stream.on('error', () => response.destroy());
        response.once('close', () => stream.destroy());
        stream.pipe(response);
    }

    private async control(
        request: IncomingMessage,
        response: ServerResponse,
        path: string,
    ): Promise<void> {
        if (this._requests.size >= (this._options.maxConcurrentRequests ?? 64))
            throw new RemoteProtocolError('resource-limit', 'Too many local requests are active.');
        const controller = new AbortController();
        this._requests.add(controller);
        const cancel = () => controller.abort();
        request.once('aborted', cancel);
        response.once('close', cancel);
        try {
            if (request.method === 'DELETE') {
                await this._options.transport.revoke(controller.signal);
                response.writeHead(204).end();
                setImmediate(() => {
                    void this.dispose();
                });
                return;
            }
            let value;
            if (path === remoteRoutes.host)
                value = remoteHostDescriptorSchema.parse(
                    await this._options.transport.describe(controller.signal),
                );
            else {
                const session = await this._options.transport.session(controller.signal);
                if (!session)
                    throw new RemoteProtocolError(
                        'unauthorized',
                        'The remote device session is no longer authorized.',
                    );
                value = remoteSessionDescriptorSchema.parse(session);
            }
            response
                .writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' })
                .end(JSON.stringify(value));
        } finally {
            this._requests.delete(controller);
            request.off('aborted', cancel);
            response.off('close', cancel);
        }
    }
    private async upgrade(request: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> {
        this.authorize(request);
        if (this._requests.size >= (this._options.maxConcurrentRequests ?? 64))
            throw new RemoteProtocolError('resource-limit', 'Too many local streams are active.');
        const path = request.url!;
        if (this._registry.match('GET', path).kind !== 'websocket' || !this._options.openWebSocket)
            throw new RemoteProtocolError('forbidden', 'This local event route is not registered.');
        const controller = new AbortController();
        this._requests.add(controller);
        const disconnected = () => {
            controller.abort();
            this._requests.delete(controller);
        };
        socket.once('close', disconnected);
        let remote: WebSocket;
        try {
            remote = await this._options.openWebSocket(path, controller.signal);
        } catch (cause) {
            this._requests.delete(controller);
            socket.off('close', disconnected);
            throw cause;
        }
        if (controller.signal.aborted || this._disposed || remote.readyState !== WebSocket.OPEN) {
            remote.terminate();
            this._requests.delete(controller);
            socket.off('close', disconnected);
            socket.destroy();
            return;
        }
        remote.pause();
        let upgraded = false;
        try {
            this._upgrades.handleUpgrade(request, socket, head, (local) => {
                upgraded = true;
                this._webSockets.add(local);
                this._webSockets.add(remote);
                let closed = false;
                const cleanup = () => {
                    if (closed) return;
                    closed = true;
                    clearInterval(heartbeat);
                    controller.abort();
                    local.terminate();
                    remote.terminate();
                    this._webSockets.delete(local);
                    this._webSockets.delete(remote);
                    this._requests.delete(controller);
                    socket.off('close', disconnected);
                };
                const forward = (source: WebSocket, destination: WebSocket) =>
                    source.on('message', (data, binary) => {
                        if (
                            destination.readyState !== WebSocket.OPEN ||
                            destination.bufferedAmount > 1048576
                        ) {
                            cleanup();
                            return;
                        }
                        source.pause();
                        destination.send(data, { binary }, (cause) => {
                            if (cause) cleanup();
                            else source.resume();
                        });
                    });
                let localAlive = true;
                let remoteAlive = true;
                local.on('pong', () => {
                    localAlive = true;
                });
                remote.on('pong', () => {
                    remoteAlive = true;
                });
                const heartbeat = setInterval(() => {
                    if (!localAlive || !remoteAlive) {
                        cleanup();
                        return;
                    }
                    localAlive = false;
                    remoteAlive = false;
                    local.ping();
                    remote.ping();
                }, 25000);
                heartbeat.unref();
                local.once('close', cleanup);
                remote.once('close', cleanup);
                local.on('error', cleanup);
                remote.on('error', cleanup);
                forward(local, remote);
                forward(remote, local);
                remote.resume();
            });
        } finally {
            if (!upgraded) {
                remote.terminate();
                this._requests.delete(controller);
                socket.off('close', disconnected);
            }
        }
    }
    private fail(response: ServerResponse, cause: unknown): void {
        if (response.headersSent || response.destroyed) {
            response.destroy();
            return;
        }
        const error =
            cause instanceof RemoteProtocolError
                ? cause
                : new RemoteProtocolError(
                      'network',
                      'The local view could not complete this request.',
                  );
        const status =
            error.code === 'unauthorized'
                ? 401
                : error.code === 'resource-limit'
                  ? 413
                  : error.code === 'forbidden'
                    ? 403
                    : 502;
        response.writeHead(status, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
        });
        response.end(JSON.stringify({ error: { code: error.code, message: error.message } }));
    }
    // #endregion
}
