// #region Imports
import { normalizeRemotePath } from '@pixel-brewery/remote-protocol';
import type { IBrowserRemoteEventsOptions } from './interfaces/IBrowserRemoteEventsOptions.js';
// #endregion

/**
 * Owns one same-origin bounded WebSocket and explicit read-reconciliation callbacks.
 * @remarks This lifecycle never queues or resends application messages.
 * @public
 */
export class BrowserRemoteEvents {
    // #region Fields
    private _socket: WebSocket | undefined;
    private _cancelRetry: (() => void) | undefined;
    private _attempt = 0;
    private _openedAt: number | undefined;
    private _disposed = false;
    private _generation = 0;
    // #endregion
    // #region Ctor
    /**
     * Compose a socket factory and deterministic scheduler.
     * @param _options - Same-origin path, byte/retry bounds and product event observers.
     * @throws Error for unsupported origins, relative-path escapes or invalid limits.
     * @public
     */
    public constructor(private readonly _options: IBrowserRemoteEventsOptions) {
        const url = new URL(_options.origin);
        if (!['http:', 'https:'].includes(url.protocol) || url.origin !== _options.origin)
            throw new Error('Expected a plain same-origin event origin.');
        normalizeRemotePath(_options.path);
        for (const bound of [_options.maxMessageBytes ?? 65_536, _options.retryLimit ?? 8])
            if (!Number.isSafeInteger(bound) || bound < 0)
                throw new RangeError('Event bounds must be nonnegative safe integers.');
    }
    // #endregion
    // #region Methods
    /**
     * Open once; subsequent calls retain an existing socket.
     * @throws Error after permanent disposal.
     * @public
     */
    public connect(): void {
        if (this._disposed) throw new Error('Events are disposed.');
        if (this._socket) return;
        this._cancelRetry?.();
        this._cancelRetry = undefined;
        const generation = ++this._generation,
            socket = this._options.createSocket(
                `${this._options.origin.replace(/^http/u, 'ws')}${this._options.path}`,
            );
        this._socket = socket;
        socket.binaryType = 'arraybuffer';
        socket.onopen = () => {
            if (generation === this._generation) {
                this._openedAt = this._options.clock.now();
                this._options.onReconcile();
            }
        };
        socket.onmessage = (event: MessageEvent<unknown>) => {
            if (generation !== this._generation) return;
            const data = event.data;
            if (typeof data !== 'string' && !(data instanceof ArrayBuffer)) {
                socket.close(1003);
                return;
            }
            const length =
                typeof data === 'string' ? new TextEncoder().encode(data).length : data.byteLength;
            if (length > (this._options.maxMessageBytes ?? 65_536)) {
                socket.close(1009);
                return;
            }
            this._options.onMessage(data);
        };
        socket.onclose = (event) => {
            if (generation !== this._generation || this._disposed) return;
            this._socket = undefined;
            if ([1000, 1003, 1008, 1009].includes(event.code)) return;
            if (this._openedAt !== undefined && this._options.clock.now() - this._openedAt >= 5000)
                this._attempt = 0;
            this._openedAt = undefined;
            if (++this._attempt > (this._options.retryLimit ?? 8)) return;
            this._cancelRetry = this._options.clock.schedule(
                () => {
                    this._cancelRetry = undefined;
                    this.connect();
                },
                Math.min(500 * 2 ** Math.min(this._attempt - 1, 20), 30_000),
            );
        };
        socket.onerror = () => socket.close();
    }
    /**
     * Close the socket and pending reconnect timer permanently.
     * @public
     */
    public dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        ++this._generation;
        this._cancelRetry?.();
        this._cancelRetry = undefined;
        this._socket?.close();
        this._socket = undefined;
    }
    // #endregion
}
