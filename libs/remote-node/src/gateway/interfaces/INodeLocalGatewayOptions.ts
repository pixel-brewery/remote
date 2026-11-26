// #region Imports
import type { IRemoteClientTransport } from '@pixel-brewery/remote-client';
import type {
    IRemoteContentPolicy,
    IRemoteHostIdentity,
    IRemoteRouteDefinition,
} from '@pixel-brewery/remote-protocol';
import type { WebSocket } from 'ws';
// #endregion
/**
 * Protected local view composition; assets and route authority belong to the embedding application.
 *
 * @public
 */
export interface INodeLocalGatewayOptions {
    /**
     * Application-owned saved-connection identifier identifying this local view.
     *
     * @public
     */
    readonly connectionId: string;
    /**
     * Application and installation namespace to which this owner belongs.
     *
     * @public
     */
    readonly identity: IRemoteHostIdentity;
    /**
     * Privileged transport already bound to one selected verified host.
     *
     * @public
     */
    readonly transport: IRemoteClientTransport;
    /**
     * Operations that the packaged view may forward to the already selected remote peer. No destination parameter or generic proxy route exists.
     *
     * @public
     */
    readonly routes: readonly IRemoteRouteDefinition[];
    /**
     * Application-owned immutable packaged web-asset root. Symbolic links outside the canonical root are rejected.
     *
     * @public
     */
    readonly assetsPath: string;
    /**
     * Immutable HTTPS image/media/connection permissions for trusted packaged assets only. Every omitted flag defaults to false; scripts, frames and proxy responses remain restricted.
     *
     * @public
     */
    readonly contentPolicy?: IRemoteContentPolicy;
    /**
     * Optional privileged event connector. Only routes registered as WebSocket operations can invoke it.
     *
     * @public
     */
    readonly openWebSocket?: (path: string, signal: AbortSignal) => Promise<WebSocket>;
    /**
     * Maximum simultaneous TCP connections. The host defaults to 128 and the local view to 64.
     *
     * @public
     */
    readonly maxConnections?: number;
    /**
     * Maximum owned requests or local forwarding operations, default 64.
     *
     * @public
     */
    readonly maxConcurrentRequests?: number;
    /**
     * Maximum graceful shutdown wait before remaining sockets are destroyed, default one second.
     *
     * @public
     */
    readonly shutdownTimeoutMs?: number;
}
