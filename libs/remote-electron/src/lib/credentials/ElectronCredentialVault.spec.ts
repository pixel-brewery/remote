// #region Imports
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { ElectronCredentialVault } from './ElectronCredentialVault.js';
// #endregion

it('persists OS ciphertext and isolates application and installation namespaces', async () => {
    // Arrange
    const directory = await mkdtemp(join(tmpdir(), 'remote-vault-')),
        filename = join(directory, 'vault.json'),
        secret = 'credential-'.repeat(6);
    const storage = {
        isEncryptionAvailable: () => true,
        encryptString: (value: string) =>
            Buffer.from(Array.from(Buffer.from(value), (byte) => byte ^ 0x55)),
        decryptString: (value: Buffer) =>
            Buffer.from(Array.from(Buffer.from(value), (byte) => byte ^ 0x55)).toString(),
        getSelectedStorageBackend: () => 'keychain',
    };
    const vault = new ElectronCredentialVault(filename, storage);
    try {
        // Act
        await vault.set({ appId: 'one', hostId: 'host' }, secret);
        // Assert
        expect(await readFile(filename, 'utf8')).not.toContain(secret);
        expect(await vault.get({ appId: 'one', hostId: 'host' })).toBe(secret);
        expect(await vault.get({ appId: 'two', hostId: 'host' })).toBeNull();
        await vault.delete({ appId: 'one', hostId: 'host' });
        expect(await vault.get({ appId: 'one', hostId: 'host' })).toBeNull();
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
it('rejects the Linux plaintext fallback', () => {
    // Arrange
    const storage = {
        isEncryptionAvailable: () => true,
        encryptString: () => Buffer.from(''),
        decryptString: () => '',
        getSelectedStorageBackend: () => 'basic_text',
    };
    // Act / Assert
    expect(() => new ElectronCredentialVault('/unused/vault.json', storage)).toThrow('OS-backed');
});
