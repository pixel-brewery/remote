// #region Imports
import { expect, it, vi } from 'vitest';
import { createCapacitorRemoteBridge } from './createCapacitorRemoteBridge.js';
// #endregion

it('exposes only frozen validated connection controls', async () => {
    // Arrange
    const invoke = vi.fn(async () => ({ response: { kind: 'connections', connections: [] } }));
    const bridge = createCapacitorRemoteBridge({
        invoke,
        scanPairing: async () => ({ bootstrap: {} }),
    });
    // Act
    const connections = await bridge.listConnections();
    // Assert
    expect(Object.isFrozen(bridge)).toBe(true);
    expect(connections).toEqual([]);
    expect(invoke).toHaveBeenCalledWith({ request: { kind: 'connections.list' } });
    expect('invoke' in bridge).toBe(false);
    await expect(bridge.scanPairing()).rejects.toThrow();
});
it('rejects credential-bearing native view replies', async () => {
    // Arrange
    const bridge = createCapacitorRemoteBridge({
        invoke: async () => ({
            response: {
                kind: 'view',
                view: {
                    connectionId: 'one',
                    identity: { appId: 'example', hostId: 'host' },
                    origin: 'http://127.0.0.1:4545',
                    credential: 'secret',
                },
            },
        }),
        scanPairing: async () => ({ bootstrap: {} }),
    });
    // Act / Assert
    await expect(bridge.openConnection('one')).rejects.toThrow();
});
