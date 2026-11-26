// #region Imports
import type { Signal } from '@angular/core';
import type { RemoteSession, RemoteSessionState } from '@pixel-brewery/remote-client';
// #endregion

/**
 * Read-only signal projection over the canonical client session.
 * @public
 */
export interface IRemoteSessionSignals {
    /**
     * The same session registered by the application.
     * @public
     */
    readonly session: RemoteSession;
    /**
     * Credential-free current state.
     * @public
     */
    readonly state: Signal<RemoteSessionState>;
    /**
     * Whether application operations may currently be requested.
     * @public
     */
    readonly ready: Signal<boolean>;
}
