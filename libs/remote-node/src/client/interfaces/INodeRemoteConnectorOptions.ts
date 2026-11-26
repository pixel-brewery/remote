// #region Imports
import type { IRemoteCredentialStore } from '@pixel-brewery/remote-client';
import type { IRemoteHostIdentity, IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
// #endregion
/**
 * Native connection policy; the app owns protected credentials and optional TLS trust roots.
 *
 * @public
 */
export interface INodeRemoteConnectorOptions {
    /**
     * App and installation identity verified before reading or sending any stored device credential.
     *
     * @public
     */
    readonly expectedIdentity: IRemoteHostIdentity;
    /**
     * Application-owned protected credential store; renderer code must not receive this port.
     *
     * @public
     */
    readonly credentialStore: IRemoteCredentialStore;
    /**
     * Operations admitted by this native connection. They must match the application host registry. Unknown operations never reach the selected peer.
     *
     * @public
     */
    readonly routes: readonly IRemoteRouteDefinition[];
    /**
     * Identifier of the registered transport connector used for this endpoint.
     *
     * @public
     */
    readonly transportId?: 'lan-http' | 'lan-https';
    /**
     * Test-only exception for numeric loopback destinations. Production configuration must omit this flag.
     *
     * @public
     */
    readonly allowLoopbackForTests?: boolean;
    /**
     * Optional application-approved PEM trust anchor. Server certificate verification remains enabled.
     *
     * @public
     */
    readonly certificateAuthority?: string | Buffer;
    /**
     * Maximum time to receive response headers or finish a WebSocket handshake, default fifteen seconds.
     *
     * @public
     */
    readonly requestTimeoutMs?: number;
    /**
     * Maximum owned requests or local forwarding operations, default 64.
     *
     * @public
     */
    readonly maxConcurrentRequests?: number;
}
