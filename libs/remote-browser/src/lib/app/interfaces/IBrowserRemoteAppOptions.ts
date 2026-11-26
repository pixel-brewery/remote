// #region Imports
import type { IRemoteControlBridge, RemoteSession } from '@pixel-brewery/remote-client';
import type { IBrowserRemotePairingScanner } from './IBrowserRemotePairingScanner.js';
import type { IBrowserRemoteWindow } from './IBrowserRemoteWindow.js';
// #endregion

/**
 * Application composition of the pre-framework remote gate.
 *
 * @typeParam TMetadata - Application-validated metadata read through the authorized session, such as capabilities.
 * @public
 */
export interface IBrowserRemoteAppOptions<TMetadata> {
    /**
     * Application namespace; invitations, hosts, saved connections and local views of other applications are rejected.
     *
     * @public
     */
    readonly appId: string;
    /**
     * Current document window or an equivalent structural port.
     *
     * @public
     */
    readonly window: IBrowserRemoteWindow;
    /**
     * Exact origins that always start normally without probing, for example an embedded local host.
     * They are also never accepted as a native remote view.
     *
     * @public
     */
    readonly localOrigins: readonly string[];
    /**
     * Read and validate the application's own metadata through the ready session before `ready` is published.
     * A rejection publishes `error` with reason `capabilities`. The signal aborts on deadline, replacement and disposal.
     *
     * @public
     */
    readonly readCapabilities: (session: RemoteSession, signal: AbortSignal) => Promise<TMetadata>;
    /**
     * Optional closed native connection-control bridge of a packaged client. Its presence makes the client start
     * normally outside its protected loopback view and enables connection commands.
     *
     * @public
     */
    readonly controls?: IRemoteControlBridge;
    /**
     * Optional real native invitation scanner; it is offered only together with native controls.
     *
     * @public
     */
    readonly scanner?: IBrowserRemotePairingScanner;
    /**
     * Optional label factory for browser fragment pairing; defaults to the navigator platform followed by "browser".
     *
     * @public
     */
    readonly deviceName?: () => string;
    /**
     * Deadline in milliseconds for one preparation; defaults to 15000. Expiry publishes `error` with reason `connection`.
     *
     * @public
     */
    readonly timeoutMs?: number;
    /**
     * Session storage key for the public pairing-attempt identifier; defaults to `<appId>.remote.pending-attempt`.
     * The stored value never contains the invitation challenge.
     *
     * @public
     */
    readonly attemptStorageKey?: string;
    /**
     * Optional sink for exceptions thrown by phase observers; observer failures never change the gate lifecycle.
     * The sink itself must not throw.
     *
     * @public
     */
    readonly onObserverError?: (error: unknown) => void;
}
