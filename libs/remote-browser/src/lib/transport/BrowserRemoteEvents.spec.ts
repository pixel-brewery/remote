// #region Imports
import { expect, it } from 'vitest';
import { BrowserRemoteEvents } from './BrowserRemoteEvents.js';
// #endregion

function setup() {
    const jobs: (() => void)[] = [],
        sockets: WebSocket[] = [];
    const events = new BrowserRemoteEvents({
        origin: 'http://192.168.1.1:4321',
        path: '/events',
        clock: {
            now: () => 1000,
            schedule: (callback) => {
                jobs.push(callback);
                return () => {
                    const index = jobs.indexOf(callback);
                    if (index >= 0) jobs.splice(index, 1);
                };
            },
        },
        retryLimit: 2,
        onMessage: () => undefined,
        onReconcile: () => undefined,
        createSocket: () => {
            const socket = {
                close: () => undefined,
                onopen: null,
                onmessage: null,
                onclose: null,
                onerror: null,
            } as unknown as WebSocket;
            sockets.push(socket);
            return socket;
        },
    });
    return { events, jobs, sockets };
}
it('bounds repeated open-then-close flapping rather than resetting the retry budget on open', () => {
    // Arrange
    const { events, jobs, sockets } = setup();
    events.connect();
    // Act
    for (let index = 0; index < 3; ++index) {
        const socket = sockets.at(-1)!;
        socket.onopen?.call(socket, {} as Event);
        socket.onclose?.call(socket, { code: 1006 } as CloseEvent);
        jobs.shift()?.();
    }
    // Assert
    expect(sockets).toHaveLength(3);
    expect(jobs).toHaveLength(0);
    events.dispose();
});
it('does not reconnect after a server policy or payload-limit rejection', () => {
    // Arrange
    const { events, jobs, sockets } = setup();
    events.connect();
    const socket = sockets[0]!;
    // Act
    socket.onopen?.call(socket, {} as Event);
    socket.onclose?.call(socket, { code: 1008 } as CloseEvent);
    // Assert
    expect(jobs).toHaveLength(0);
    events.dispose();
});
