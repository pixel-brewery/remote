// #region Imports
import { remotePairingBootstrapSchema } from './schemas/remotePairingBootstrapSchema.js';
import type { IRemotePairingBootstrap } from './interfaces/IRemotePairingBootstrap.js';
// #endregion

/**
 * Encodes one invitation in a browser fragment so its challenge is excluded from HTTP requests and referrers.
 *
 * @param input - Canonical short-lived invitation created by the selected host.
 * @returns The app-root pairing URL for QR rendering or conscious out-of-band copying.
 * @throws A schema validation error for an invalid invitation.
 * @remarks Treat the returned URL as a secret until the challenge expires. Do not log it or store it as a saved connection.
 * @public
 */
export function createRemotePairingUrl(input: IRemotePairingBootstrap): string {
    const bootstrap = remotePairingBootstrapSchema.parse(input);
    const fragment = new URLSearchParams({
        pair: bootstrap.challenge,
        app: bootstrap.appId,
        host: bootstrap.hostId,
        expires: bootstrap.expiresAt,
    });
    return bootstrap.origin + '/#' + fragment.toString();
}
