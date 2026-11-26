/**
 * Authorization changes which require transports to terminate owned channels.
 *
 * @public
 */
export type RemoteAccessEvent =
    | {
          /**
           * Committed authorization or invitation-lifecycle transition that the observing transport must apply.
           */
          readonly kind: 'revoked';
          /**
           * Opaque identifier of one durably paired device.
           */
          readonly deviceId: string;
      }
    | {
          /**
           * Committed authorization or invitation-lifecycle transition that the observing transport must apply.
           */
          readonly kind: 'disabled';
      }
    | {
          /**
           * Committed authorization or invitation-lifecycle transition that the observing transport must apply.
           */
          readonly kind: 'pairings-invalidated';
      };
