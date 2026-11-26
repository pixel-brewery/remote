/**
 * Closed private host-control command set; there is no arbitrary remote procedure call.
 *
 * @remarks
 * Commands are parsed only after the application's local authority check.
 * They carry no credentials, grant records or executable callbacks.
 *
 * @public
 */
export type RemoteHostControlCommand =
    | {
          /**
           * Persists explicit remote activation and starts the listener.
           */
          readonly kind: 'enable';
      }
    | {
          /**
           * Closes access and durably stores disabled intent.
           */
          readonly kind: 'disable';
      }
    | {
          /**
           * Rechecks the private network interface after a network change or resume.
           */
          readonly kind: 'reconcile';
      }
    | {
          /**
           * Creates a short-lived out-of-band pairing invitation.
           */
          readonly kind: 'pair';
          /**
           * Optional advertised endpoint identifier; omission selects the first available endpoint.
           */
          readonly endpointId?: string;
      }
    | {
          /**
           * Removes one durable device grant.
           */
          readonly kind: 'revoke';
          /**
           * Exact opaque device identifier selected from the local status projection.
           */
          readonly deviceId: string;
      };
