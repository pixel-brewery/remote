// #region Imports
import type { IRemotePrincipal } from '@pixel-brewery/remote-protocol';
// #endregion
/**
 * Ephemeral privileged pairing result; Node adapters project its credential appropriately.
 *
 * @public
 */
export type IRemotePairingGrant =
    | {
          /**
           * Discriminator identifying whether host approval is pending or a device grant is available.
           */
          readonly status: 'pending';
          /**
           * Opaque identifier used by local host administration to approve or reject this attempt.
           */
          readonly pairingId: string;
          /**
           * Exclusive expiration instant in UTC ISO 8601 format.
           */
          readonly expiresAt: string;
      }
    | {
          /**
           * Discriminator identifying whether host approval is pending or a device grant is available.
           */
          readonly status: 'paired';
          /**
           * Opaque identifier used by local host administration to approve or reject this attempt.
           */
          readonly pairingId: string;
          /**
           * Authenticated device identity and its granted capabilities.
           */
          readonly principal: IRemotePrincipal;
          /**
           * Ephemeral plaintext bearer for privileged runtime consumption. Persist only its protected client value or host digest.
           */
          readonly credential: string;
          /**
           * Exclusive expiration instant in UTC ISO 8601 format.
           */
          readonly expiresAt: string;
      };
