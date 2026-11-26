// #region Imports
import type { IRemoteClientClock } from '@pixel-brewery/remote-client';
// #endregion

/**
 * Same-origin WebSocket lifecycle supplied by the application.
 * @public
 */
export interface IBrowserRemoteEventsOptions {
    /**
     * Current browser or protected local gateway origin.
     * @public
     */
    readonly origin: string;
    /**
     * Registered product event path.
     * @public
     */
    readonly path: string;
    /**
     * WebSocket factory without bearer credentials in its URL.
     * @public
     */
    readonly createSocket: (url: string) => WebSocket;
    /**
     * Scheduler used for bounded recovery.
     * @public
     */
    readonly clock: IRemoteClientClock;
    /**
     * Product-owned wire validation receives each bounded message.
     * @public
     */
    readonly onMessage: (data: string | ArrayBuffer) => void;
    /**
     * Re-read current domain state after every reconnect.
     * @public
     */
    readonly onReconcile: () => void;
    /**
     * Default maximum message size is 65536 bytes.
     * @public
     */
    readonly maxMessageBytes?: number;
    /**
     * Default maximum reconnection attempts is eight.
     * @public
     */
    readonly retryLimit?: number;
}
