// #region Imports
import {
    DestroyRef,
    ErrorHandler,
    inject,
    makeEnvironmentProviders,
    type EnvironmentProviders,
} from '@angular/core';
import type { RemoteSession } from '@pixel-brewery/remote-client';
import { REMOTE_SESSION } from './REMOTE_SESSION.js';
// #endregion

/**
 * Register one headless session with injector-owned cleanup and no eager network initialization.
 * @param factory - Injection-context factory selecting the application identity and runtime connector.
 * @returns Environment providers for a root or lazy route scope.
 * @remarks The injector disposes the same session that signal consumers observe. The application calls initialize explicitly.
 * @public
 */
export function provideRemoteSession(factory: () => RemoteSession): EnvironmentProviders {
    return makeEnvironmentProviders([
        {
            provide: REMOTE_SESSION,
            useFactory: () => {
                const session = factory(),
                    errors = inject(ErrorHandler);
                inject(DestroyRef).onDestroy(() => {
                    void session.dispose().catch((error: unknown) => errors.handleError(error));
                });
                return session;
            },
        },
    ]);
}
