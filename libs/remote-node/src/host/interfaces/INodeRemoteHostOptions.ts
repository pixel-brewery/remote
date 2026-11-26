// #region Imports
import type { IRemoteHostIdentity, IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
import type { RemoteAccessService } from '@pixel-brewery/remote-core';
import type { IRemoteApplicationAdapter } from './IRemoteApplicationAdapter.js';
import type { IRemoteNodeTransport } from '../../transport/interfaces/IRemoteNodeTransport.js';
// #endregion
/**
 * Explicit private host composition. No product or certificate service is embedded.
 *
 * @public
 */
export interface INodeRemoteHostOptions {
    /**
     * Application and installation namespace to which this owner belongs.
     *
     * @public
     */
    readonly identity: IRemoteHostIdentity;
    /**
     * Human-readable host or device label; never interpreted as authority.
     *
     * @public
     */
    readonly name: string;
    /**
     * Sanitized authorization state with neither token hashes nor plaintext credentials.
     *
     * @public
     */
    readonly access: RemoteAccessService;
    /**
     * Explicit product operation registry. SDK-reserved operations cannot be overridden and unknown methods or paths are denied.
     *
     * @public
     */
    readonly routes: readonly IRemoteRouteDefinition[];
    /**
     * Product dispatcher retaining canonical validation, business decisions and resource authorization.
     *
     * @public
     */
    readonly application: IRemoteApplicationAdapter;
    /**
     * Explicit listener adapters. Defaults to one unencrypted private-LAN HTTP listener.
     *
     * @public
     */
    readonly transports?: readonly IRemoteNodeTransport[];
    /**
     * Application-owned immutable packaged web-asset root. Symbolic links outside the canonical root are rejected.
     *
     * @public
     */
    readonly assetsPath?: string;
    /**
     * Optional numeric private interface address. Omission selects a supported physical private IPv4 interface; wildcard, public and DNS addresses are rejected.
     *
     * @public
     */
    readonly host?: string;
    /**
     * First listener port, default 49152. Zero is permitted only by the explicit test-loopback policy.
     *
     * @public
     */
    readonly port?: number;
    /**
     * Inclusive fallback port bound. The range is capped at 128 alternatives.
     *
     * @public
     */
    readonly portEnd?: number;
    /**
     * Test-only exception for numeric loopback destinations. Production configuration must omit this flag.
     *
     * @public
     */
    readonly allowLoopbackForTests?: boolean;
    /**
     * Optional HTTP token-safe session-cookie name; the default is scoped to the app and host identifiers.
     *
     * @public
     */
    readonly cookieName?: string;
    /**
     * Maximum simultaneous TCP connections. The host defaults to 128 and the local view to 64.
     *
     * @public
     */
    readonly maxConnections?: number;
    /**
     * Maximum active host WebSockets, default 64.
     *
     * @public
     */
    readonly maxWebSockets?: number;
    /**
     * Maximum graceful shutdown wait before remaining sockets are destroyed, default one second.
     *
     * @public
     */
    readonly shutdownTimeoutMs?: number;
    /**
     * Application-owned packaged-asset content policy. The default permits only same-origin scripts and denies embedding.
     *
     * @public
     */
    readonly contentSecurityPolicy?: string;
    /**
     * Optional sanitized diagnostic callback receiving operation and stable code without credentials or private payloads.
     *
     * @public
     */
    readonly reportFailure?: (failure: {
        /**
         * Sanitized operation category associated with the reported failure; never a URL, credential or product payload.
         */
        readonly operation: string;
        /**
         * Stable protocol failure category safe to cross the process or network boundary.
         */
        readonly code: string;
    }) => void;
}
