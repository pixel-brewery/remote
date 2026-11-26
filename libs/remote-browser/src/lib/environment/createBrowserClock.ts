// #region Imports
import type { IRemoteClientClock } from '@pixel-brewery/remote-client';
// #endregion

/**
 * Adapt supplied browser timing APIs without reading globals during module import.
 * @param environment - Browser timer functions belonging to the owning window.
 * @returns Clock with cancellation for every scheduled callback.
 * @public
 */
export function createBrowserClock(
    environment: Pick<Window, 'setTimeout' | 'clearTimeout'>,
): IRemoteClientClock {
    return {
        now: () => Date.now(),
        schedule: (callback, delay) => {
            const timer = environment.setTimeout(callback, delay);
            return () => environment.clearTimeout(timer);
        },
    };
}
