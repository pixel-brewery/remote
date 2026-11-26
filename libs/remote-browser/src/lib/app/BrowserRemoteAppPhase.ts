/**
 * Credential-free gate states published before an application's own framework may start.
 *
 * @remarks `normal` starts the application without a remote session; `ready` starts it against the verified host;
 * `preparing`, `pairing-required`, `pending-approval` and `error` show the application's connection view instead.
 * @public
 */
export type BrowserRemoteAppPhase =
    | {
          /**
           * `idle` before preparation, `preparing` while a remote start is verified, `normal` for an ordinary start,
           * `ready` after host, session and capabilities are verified, `pairing-required` when a new invitation is needed,
           * `pending-approval` when a host that approves devices itself has not yet approved this invitation (preparing
           * again sends the same attempt once it has).
           *
           * @public
           */
          readonly kind:
              'idle' | 'preparing' | 'normal' | 'ready' | 'pairing-required' | 'pending-approval';
      }
    | {
          /**
           * A remote start failed without publishing guessed capabilities.
           *
           * @public
           */
          readonly kind: 'error';
          /**
           * Failed boundary: host connection or deadline, invitation or pairing, or the application's capability read.
           *
           * @public
           */
          readonly reason: 'connection' | 'invitation' | 'capabilities';
      };
