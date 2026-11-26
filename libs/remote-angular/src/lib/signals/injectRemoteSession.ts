// #region Imports
import { computed, DestroyRef, inject, signal } from '@angular/core';
import { REMOTE_SESSION } from '../providers/REMOTE_SESSION.js';
import type { IRemoteSessionSignals } from './interfaces/IRemoteSessionSignals.js';
// #endregion

/**
 * Project the injected canonical lifecycle into Angular read-only signals.
 * @returns The original session, its current snapshot and a derived ready signal.
 * @remarks Call within an Angular injection context. Consumer destruction removes only its subscription; the provider owns disposal.
 * @public
 */
export function injectRemoteSession(): IRemoteSessionSignals {
    const session = inject(REMOTE_SESSION),
        state = signal(session.state);
    const unsubscribe = session.subscribe((value) => state.set(value));
    inject(DestroyRef).onDestroy(unsubscribe);
    return { session, state: state.asReadonly(), ready: computed(() => state().kind === 'ready') };
}
