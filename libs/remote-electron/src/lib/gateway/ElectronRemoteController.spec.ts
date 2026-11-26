// #region Imports
import type { IpcMainInvokeEvent } from 'electron';
import { expect, it, vi } from 'vitest';
import { ElectronRemoteController } from './ElectronRemoteController.js';
import type { IRemoteElectronActivation } from './interfaces/IRemoteElectronActivation.js';
// #endregion

const activation: IRemoteElectronActivation = {
    connectionId: 'selected',
    identity: { appId: 'example', hostId: 'host' },
    origin: 'http://127.0.0.1:4242',
    cookie: {
        name: 'remote_local',
        value: 'x'.repeat(43),
        path: '/',
        httpOnly: true,
        sameSite: 'strict',
        secure: false,
    },
};
const frame = {},
    event = { senderFrame: frame, sender: { mainFrame: frame } } as unknown as IpcMainInvokeEvent;
function setup(value: IRemoteElectronActivation) {
    const activateView = vi.fn(async () => undefined),
        openConnection = vi.fn(async () => value);
    const controller = new ElectronRemoteController({
        appId: 'example',
        isTrustedSender: () => true,
        activateView,
        runtime: {
            openConnection,
            pair: async () => value,
            listConnections: async () => [],
            closeConnection: async () => undefined,
            forgetConnection: async () => undefined,
        },
    });
    return { controller, activateView, openConnection };
}
it('strips the private capability from a validated public view response', async () => {
    // Arrange
    const { controller, activateView } = setup(activation);
    // Act
    const result = await controller.handle(event, {
        kind: 'connections.open',
        connectionId: 'selected',
    });
    // Assert
    expect(activateView).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(result)).not.toContain(activation.cookie.value);
    expect(result.kind).toBe('view');
});
it('rejects non-loopback Utility replies before installing cookies or navigating', async () => {
    // Arrange
    const { controller, activateView } = setup({
        ...activation,
        origin: 'http://192.168.1.10:4242',
    });
    // Act / Assert
    await expect(
        controller.handle(event, { kind: 'connections.open', connectionId: 'selected' }),
    ).rejects.toThrow('loopback');
    expect(activateView).not.toHaveBeenCalled();
});
it('rejects malformed cookie flags and additional authority before activation', async () => {
    // Arrange
    const { controller, activateView } = setup({
        ...activation,
        cookie: { ...activation.cookie, httpOnly: false },
    } as unknown as IRemoteElectronActivation);
    // Act / Assert
    await expect(
        controller.handle(event, { kind: 'connections.open', connectionId: 'selected' }),
    ).rejects.toThrow('capability');
    expect(activateView).not.toHaveBeenCalled();
});
it('rejects subframes before invoking the privileged runtime', async () => {
    // Arrange
    const { controller, openConnection } = setup(activation);
    // Act / Assert
    await expect(
        controller.handle({ ...event, senderFrame: {} } as IpcMainInvokeEvent, {
            kind: 'connections.open',
            connectionId: 'selected',
        }),
    ).rejects.toThrow('sender');
    expect(openConnection).not.toHaveBeenCalled();
});
