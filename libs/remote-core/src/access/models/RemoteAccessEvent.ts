/**
 * Committed authorization changes delivered synchronously to access observers.
 *
 * @remarks
 * Every event follows its durable or lifecycle commit. Transports must terminate
 * owned channels on `revoked` and `disabled`; `pairings-invalidated` ends every
 * outstanding invitation. `paired` lets local administration react to a newly
 * stored device grant, for example by closing a displayed invitation. No event
 * carries a credential, challenge or token digest. Observers that switch on the
 * kind must tolerate kinds they do not handle.
 *
 * @public
 */
export type RemoteAccessEvent =
    | {
          /**
           * A durable device grant was removed; that device's open work must be canceled.
           */
          readonly kind: 'revoked';
          /**
           * Opaque identifier of one durably paired device.
           */
          readonly deviceId: string;
      }
    | {
          /**
           * Disabled intent was committed; every device-owned channel must be canceled.
           */
          readonly kind: 'disabled';
      }
    | {
          /**
           * Every outstanding pairing invitation was invalidated after a stop, rebind or explicit call.
           */
          readonly kind: 'pairings-invalidated';
      }
    | {
          /**
           * A new device grant was durably stored, either by QR possession or by host approval.
           */
          readonly kind: 'paired';
          /**
           * Opaque identifier of the newly paired device, matching the sanitized status projection.
           */
          readonly deviceId: string;
      };
