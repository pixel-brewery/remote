/**
 * Structural Electron Main safeStorage port, never exposed through preload.
 * @public
 */
export interface IElectronSafeStorage {
    /**
     * Whether OS-backed encryption is actually available.
     * @returns Whether OS-backed encryption is available.
     * @public
     */
    isEncryptionAvailable(): boolean;
    /**
     * Encrypt within Electron Main using the OS store.
     * @param value - Plaintext secret to encrypt inside Electron Main.
     * @returns OS-encrypted bytes safe to persist.
     * @public
     */
    encryptString(value: string): Buffer;
    /**
     * Decrypt within Electron Main only.
     * @param value - OS-encrypted bytes previously produced by this application's safeStorage instance.
     * @returns Decrypted value for Main-process mediation only.
     * @public
     */
    decryptString(value: Buffer): string;
    /**
     * Linux backends named basic_text are explicitly rejected.
     * @returns Name of the selected backend; basic_text must be rejected.
     * @public
     */
    getSelectedStorageBackend?(): string;
}
