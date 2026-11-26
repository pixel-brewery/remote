// #region Imports
import { randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import type { IRemoteSecurity } from '@pixel-brewery/remote-core';
// #endregion
/**
 * Node cryptographic defaults with no import-time I/O.
 *
 * @public
 */
export class NodeRemoteSecurity implements IRemoteSecurity {
    // #region Methods
    /**
     * Creates a base64url bearer from operating-system entropy.
     *
     * @param bytes - Entropy bytes to encode. Defaults to 32; the Node implementation accepts integers from 16 through 64.
     * @returns An unpredictable URL-safe credential.
     * @throws RangeError when entropy is outside the integer range 16 through 64 bytes.
     * @public
     */
    public randomToken(bytes = 32): string {
        if (!Number.isInteger(bytes) || bytes < 16 || bytes > 64)
            throw new RangeError('Token entropy must be between 16 and 64 bytes.');
        return randomBytes(bytes).toString('base64url');
    }
    /**
     * Produces the persisted SHA-256 digest; raw tokens are never stored.
     *
     * @param value - Plaintext UTF-8 token to digest with SHA-256.
     * @returns The deterministic token digest.
     * @public
     */
    public hashToken(value: string): string {
        return createHash('sha256').update(value, 'utf8').digest('hex');
    }
    /**
     * Compares validated digests without content-dependent early exit.
     *
     * @param left - First validated digest to compare.
     * @param right - Second validated digest to compare.
     * @returns True only when both valid digests contain the same bytes.
     * @public
     */
    public equalDigest(left: string, right: string): boolean {
        if (!/^[a-f0-9]{64}$/u.test(left) || !/^[a-f0-9]{64}$/u.test(right)) return false;
        return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
    }
    // #endregion
}
