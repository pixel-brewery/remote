// #region Imports
import type { IRemoteHostIdentity } from '@pixel-brewery/remote-protocol';
// #endregion
/**
 * Privileged bootstrap result. Native code installs the cookie; only origin/identity reach its view.
 *
 * @public
 */
export interface IRemoteLocalGatewayView {
    /**
     * Application-owned saved-connection identifier identifying this local view.
     *
     * @public
     */
    readonly connectionId: string;
    /**
     * Selected app and installation to which the privileged upstream transport belongs.
     *
     * @public
     */
    readonly identity: IRemoteHostIdentity;
    /**
     * HTTP(S) origin without credentials, path, query or fragment.
     *
     * @public
     */
    readonly origin: string;
    /**
     * Ephemeral local-view credential installed by native code; omit this object from renderer projections.
     *
     * @public
     */
    readonly cookie: {
        /**
         * Opaque per-view cookie name. Native code installs it only at the returned loopback origin.
         */
        readonly name: string;
        /**
         * Ephemeral local-view cookie secret. This value is distinct from the durable remote device credential.
         */
        readonly value: string;
        /**
         * Always the local origin root so assets and registered content requests share the same ephemeral local session.
         */
        readonly path: '/';
        /**
         * Always true so view JavaScript cannot read the local capability.
         */
        readonly httpOnly: true;
        /**
         * Always strict; cross-site requests do not carry this local capability.
         */
        readonly sameSite: 'strict';
        /**
         * False because this capability is confined to an explicit HTTP loopback origin.
         */
        readonly secure: false;
    };
}
