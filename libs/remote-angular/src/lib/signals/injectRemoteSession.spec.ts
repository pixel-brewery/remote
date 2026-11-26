// #region Imports
import {
    createEnvironmentInjector,
    ErrorHandler,
    runInInjectionContext,
    type EnvironmentInjector,
} from '@angular/core';
import { RemoteSession } from '@pixel-brewery/remote-client';
import { expect, it, vi } from 'vitest';
import { provideRemoteSession } from '../providers/provideRemoteSession.js';
import { injectRemoteSession } from './injectRemoteSession.js';
// #endregion

it('projects exactly the supplied session and disposes it with its provider scope', async () => {
    // Arrange
    const session = new RemoteSession({
        identity: { appId: 'example', hostId: 'host' },
        endpoint: { id: 'primary', transportId: 'test', origin: 'http://192.168.1.1' },
        connector: {
            id: 'test',
            connect: async () => {
                throw new Error('No implicit network work is expected.');
            },
        },
        clock: { now: () => 0, schedule: () => () => undefined },
        createId: () => 'attempt',
    });
    const dispose = vi.spyOn(session, 'dispose');
    const errors = { handleError: vi.fn() };
    const injector = createEnvironmentInjector(
        [provideRemoteSession(() => session), { provide: ErrorHandler, useValue: errors }],
        null as unknown as EnvironmentInjector,
    );
    // Act
    const projection = runInInjectionContext(injector, injectRemoteSession);
    const state = projection.state();
    injector.destroy();
    await Promise.resolve();
    // Assert
    expect(projection.session).toBe(session);
    expect(state.kind).toBe('idle');
    expect(projection.ready()).toBe(false);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(errors.handleError).not.toHaveBeenCalled();
});
