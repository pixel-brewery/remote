// #region Imports
import type { IRemoteTlsMaterial } from './IRemoteTlsMaterial.js';
// #endregion
/**
 * Applications own issuance, renewal and protected storage. The SDK only consumes supplied material.
 *
 * @public
 */
export interface IRemoteTlsProvider {
    /**
     * Loads the current app-owned certificate, key and optional chain for the TLS listener.
     *
     * @returns The current material supplied and protected by the application.
     *
     * @public
     */
    getMaterial(): Promise<IRemoteTlsMaterial>;
    /**
     * Optionally observes renewal of application-owned TLS identity material.
     * @param listener - Called after new material is available; the adapter reloads it through getMaterial.
     * @returns An idempotent cleanup removing this renewal registration. No initial callback is required.
     *
     * @public
     */
    subscribe?(listener: () => void): () => void;
}
