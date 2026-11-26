// #region Imports
import type { IRemoteLocalView } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Main-only local-view activation. Strip the cookie before returning a renderer response.
 * @public
 */
export interface IRemoteElectronActivation extends IRemoteLocalView {
    /**
     * Ephemeral loopback capability installed through Electron session.cookies in Main.
     * @public
     */
    readonly cookie: {
        /**
         * Gateway-selected cookie name.
         * @public
         */
        readonly name: string;
        /**
         * Private random local capability; never serialize into renderer state.
         * @public
         */
        readonly value: string;
        /**
         * Root cookie path within the selected loopback view.
         * @public
         */
        readonly path: '/';
        /**
         * Required protection against JavaScript cookie access.
         * @public
         */
        readonly httpOnly: true;
        /**
         * Required cross-site request restriction.
         * @public
         */
        readonly sameSite: 'strict';
        /**
         * HTTP loopback mode uses a non-Secure capability; remote TLS policy is independent.
         * @public
         */
        readonly secure: false;
    };
}
