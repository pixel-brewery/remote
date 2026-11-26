// #region Imports
import { expect, it, vi } from 'vitest';
import { RemoteSession } from '../session/RemoteSession.js';
import { RemoteConnectionManager } from './RemoteConnectionManager.js';
// #endregion

const profile = {
    id: 'one',
    identity: { appId: 'example', hostId: 'host' },
    label: 'Selected host',
    endpoints: [{ id: 'lan', transportId: 'test', origin: 'http://192.168.1.1' }],
    selectedEndpointId: 'lan',
};
function createSession(): RemoteSession {
    return new RemoteSession({
        identity: profile.identity,
        endpoint: profile.endpoints[0]!,
        connector: {
            id: 'test',
            connect: async () => {
                throw new Error('No network in profile tests.');
            },
        },
        clock: { now: () => 0, schedule: () => () => undefined },
        createId: () => 'attempt',
    });
}
it('commits persistence before updating visible profiles', async () => {
    // Arrange
    const manager = new RemoteConnectionManager({
        appId: 'example',
        store: {
            load: async () => [profile],
            save: async () => {
                throw new Error('Persistence unavailable.');
            },
        },
        createSession,
    });
    await manager.initialize();
    // Act / Assert
    await expect(manager.save({ ...profile, label: 'Changed' })).rejects.toThrow('Persistence');
    expect(manager.profiles[0]?.label).toBe('Selected host');
    await manager.dispose();
});
it('rejects duplicate and cross-product profiles before selecting any host', async () => {
    // Arrange
    const factory = vi.fn(createSession);
    const manager = new RemoteConnectionManager({
        appId: 'example',
        store: {
            load: async () => [
                profile,
                { ...profile, identity: { ...profile.identity, appId: 'other' } },
            ],
            save: async () => undefined,
        },
        createSession: factory,
    });
    // Act / Assert
    await expect(manager.initialize()).rejects.toThrow('namespace');
    expect(factory).not.toHaveBeenCalled();
    expect(manager.activeSession).toBeUndefined();
    await manager.dispose();
});
it('strips accidental secret fields before handing metadata to the durable store', async () => {
    // Arrange
    const save = vi.fn(async () => undefined);
    const manager = new RemoteConnectionManager({
        appId: 'example',
        store: { load: async () => [], save },
        createSession,
    });
    await manager.initialize();
    // Act
    await manager.save({ ...profile, credential: 'must-never-persist' } as typeof profile);
    // Assert
    expect(JSON.stringify(save.mock.calls)).not.toContain('must-never-persist');
    expect(manager.profiles).toHaveLength(1);
    await manager.dispose();
});
