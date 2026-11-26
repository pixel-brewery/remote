// #region Imports
import { describe, expect, it } from 'vitest';
import type { IRemoteAccessState } from '@pixel-brewery/remote-protocol';
import { MemoryRemoteAccessStore } from './MemoryRemoteAccessStore.js';
// #endregion
describe('MemoryRemoteAccessStore', () => {
    it('keeps the last committed value on failure and returns detached restoration data', async () => {
        // Arrange
        const state: IRemoteAccessState = {
            version: 1,
            identity: { appId: 'test.app', hostId: 'host-one' },
            enabled: false,
            devices: [],
        };
        const store = new MemoryRemoteAccessStore();
        await store.save(state);
        store.failNextSave();
        // Act
        await expect(store.save({ ...state, enabled: true })).rejects.toThrow(
            'Injected storage failure.',
        );
        const loaded = (await store.load()) as {
            enabled: boolean;
        };
        loaded.enabled = true;
        // Assert
        expect(await store.load()).toEqual(state);
        expect(store.writes).toBe(1);
    });
});
