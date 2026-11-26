// #region Imports
import { afterEach, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IRemoteAccessState } from '@pixel-brewery/remote-protocol';
import { JsonRemoteAccessStore } from './JsonRemoteAccessStore.js';
// #endregion

const roots: string[] = [];
afterEach(async () => {
    await Promise.all(roots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});
const state: IRemoteAccessState = {
    version: 1,
    identity: { appId: 'fixture', hostId: 'host-one' },
    enabled: true,
    devices: [],
};

describe('JsonRemoteAccessStore', () => {
    it('restores an absent record and atomically writes a private canonical replacement', async () => {
        // Arrange
        const root = await mkdtemp(join(tmpdir(), 'remote-store-'));
        roots.push(root);
        const path = join(root, 'private', 'access.json');
        const store = new JsonRemoteAccessStore(path);
        expect(await store.load()).toBeNull();
        // Act
        await store.save(state);
        // Assert
        expect(await store.load()).toEqual(state);
        expect((await stat(path)).mode & 0o777).toBe(0o600);
        expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(state);
    });

    it('rejects malformed replacement data without destroying the last record and refuses symbolic-link restoration', async () => {
        // Arrange
        const root = await mkdtemp(join(tmpdir(), 'remote-store-'));
        roots.push(root);
        const path = join(root, 'access.json');
        const store = new JsonRemoteAccessStore(path);
        await store.save(state);
        // Act
        await expect(
            store.save({ ...state, version: 99 } as unknown as IRemoteAccessState),
        ).rejects.toThrow();
        const target = join(root, 'other.json');
        await writeFile(target, JSON.stringify(state));
        const link = join(root, 'linked.json');
        await symlink(target, link);
        // Assert
        expect(await store.load()).toEqual(state);
        await expect(new JsonRemoteAccessStore(link).load()).rejects.toThrow('symbolic link');
    });
});
