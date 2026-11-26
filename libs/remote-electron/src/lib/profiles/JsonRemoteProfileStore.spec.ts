// #region Imports
import { mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { IRemoteSavedConnection } from '@pixel-brewery/remote-client';
import { JsonRemoteProfileStore } from './JsonRemoteProfileStore.js';
// #endregion

const profile: IRemoteSavedConnection = {
    id: 'saved-host',
    label: 'Own host',
    identity: { appId: 'example.app', hostId: 'host-fixture' },
    endpoints: [{ id: 'lan', transportId: 'lan-http', origin: 'http://192.168.1.20:4321' }],
    selectedEndpointId: 'lan',
};
const directories: string[] = [];
async function directory(): Promise<string> {
    const value = await mkdtemp(join(tmpdir(), 'remote-profile-'));
    directories.push(value);
    return value;
}
afterEach(async () => {
    await Promise.all(
        directories.splice(0).map((value) => rm(value, { recursive: true, force: true })),
    );
});

describe('JsonRemoteProfileStore', () => {
    it('persists profiles across owners in a private file without credential fields', async () => {
        // Arrange
        const path = join(await directory(), 'remote', 'profiles.json'),
            store = new JsonRemoteProfileStore(path, 'example.app');
        expect(await store.load()).toEqual([]);
        // Act
        await store.save([profile]);
        const restored = await new JsonRemoteProfileStore(path, 'example.app').load();
        // Assert
        expect(restored).toEqual([profile]);
        expect(await readFile(path, 'utf8')).not.toContain('credential');
        if (process.platform !== 'win32') expect((await stat(path)).mode & 0o777).toBe(0o600);
    });
    it('rejects foreign namespaces, duplicates and credential-bearing records before writing', async () => {
        // Arrange
        const store = new JsonRemoteProfileStore(
            join(await directory(), 'profiles.json'),
            'example.app',
        );
        // Act / Assert
        expect(() =>
            store.save([{ ...profile, identity: { ...profile.identity, appId: 'another' } }]),
        ).toThrow('namespace');
        expect(() => store.save([profile, profile])).toThrow('identifier');
        expect(() =>
            store.save([{ ...profile, credential: 'private' } as IRemoteSavedConnection]),
        ).toThrow();
        expect(await store.load()).toEqual([]);
    });
    it('commits concurrent replacements in caller order', async () => {
        // Arrange
        const store = new JsonRemoteProfileStore(
            join(await directory(), 'profiles.json'),
            'example.app',
        );
        // Act
        await Promise.all([
            store.save([profile]),
            store.save([{ ...profile, label: 'Renamed host' }]),
        ]);
        // Assert
        expect((await store.load())[0]?.label).toBe('Renamed host');
    });
    it('refuses symbolic-link files and foreign records already on disk', async () => {
        // Arrange
        const root = await directory(),
            target = join(root, 'target.json'),
            linked = join(root, 'linked.json'),
            foreign = join(root, 'foreign.json');
        await writeFile(target, JSON.stringify([profile]));
        await symlink(target, linked);
        await writeFile(
            foreign,
            JSON.stringify([{ ...profile, identity: { ...profile.identity, appId: 'another' } }]),
        );
        // Act / Assert
        await expect(new JsonRemoteProfileStore(linked, 'example.app').load()).rejects.toThrow(
            'regular file',
        );
        await expect(new JsonRemoteProfileStore(foreign, 'example.app').load()).rejects.toThrow(
            'namespace',
        );
    });
    it('rejects relative paths and non-canonical namespaces at construction', () => {
        // Arrange / Act / Assert
        expect(() => new JsonRemoteProfileStore('profiles.json', 'example.app')).toThrow(
            'absolute',
        );
        expect(() => new JsonRemoteProfileStore('/tmp/profiles.json', 'Example')).toThrow(
            'namespace',
        );
    });
});
