// #region Imports
import type {
    IRemoteHostDescriptor,
    IRemoteSessionDescriptor,
} from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Credential-free lifecycle snapshots for a single selected host.
 * @remarks Product requests and domain state never determine whether pairing succeeded.
 * @public
 */
export type RemoteSessionState =
    | {
          /**
           * Inactive, connecting or terminal lifecycle discriminator.
           * @public
           */
          readonly kind: 'idle' | 'connecting' | 'revoked' | 'disposed';
      }
    | {
          /**
           * Pairing is required or its request is currently executing.
           * @public
           */
          readonly kind: 'pairing-required' | 'pairing';
          /**
           * Verified public host descriptor with no device credential.
           * @public
           */
          readonly host: IRemoteHostDescriptor;
      }
    | {
          /**
           * The host requires explicit approval of this existing pairing attempt.
           * @public
           */
          readonly kind: 'pending-approval';
          /**
           * Verified host awaiting approval.
           * @public
           */
          readonly host: IRemoteHostDescriptor;
          /**
           * ISO timestamp after which the pending attempt can no longer complete.
           * @public
           */
          readonly expiresAt: string;
      }
    | {
          /**
           * Authentication succeeded and admitted domain operations may run.
           * @public
           */
          readonly kind: 'ready';
          /**
           * Scoped principal and host metadata; no bearer or pairing challenge is included.
           * @public
           */
          readonly session: IRemoteSessionDescriptor;
      }
    | {
          /**
           * A bounded authentication-restore retry is scheduled.
           * @public
           */
          readonly kind: 'reconnecting';
          /**
           * One-based restore attempt number within the configured retry budget.
           * @public
           */
          readonly attempt: number;
          /**
           * Unix time in milliseconds when the next restore may begin.
           * @public
           */
          readonly retryAt: number;
      }
    | {
          /**
           * The connection is offline and may need an explicit user retry.
           * @public
           */
          readonly kind: 'offline';
          /**
           * Whether connectivity failed or the automatic retry budget was exhausted.
           * @public
           */
          readonly reason: 'network' | 'retry-exhausted';
      }
    | {
          /**
           * Public host validation rejected this endpoint before authentication restore.
           * @public
           */
          readonly kind: 'incompatible';
          /**
           * Identity mismatch or unsupported protocol version requiring another host selection.
           * @public
           */
          readonly reason: 'identity' | 'protocol';
      };
