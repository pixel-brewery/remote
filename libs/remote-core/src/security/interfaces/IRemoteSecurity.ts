/**
 * Host cryptographic primitives. Digests and random credentials never become product state.
 *
 * @public
 */
export interface IRemoteSecurity {
    /**
     * Creates an unpredictable base64url credential using the requested entropy budget.
     *
     * @param bytes - Entropy bytes to encode. Defaults to 32; the Node implementation accepts integers from 16 through 64.
     * @returns An unpredictable URL-safe credential.
     *
     * @public
     */
    randomToken(bytes?: number): string;
    /**
     * Produces a deterministic digest for lookup or persistence without retaining plaintext.
     *
     * @param value - Input value interpreted by this operation; returned persistence values are detached copies.
     * @returns The deterministic token digest.
     *
     * @public
     */
    hashToken(value: string): string;
    /**
     * Compares valid fixed-format digests without content-dependent early exit.
     *
     * @param left - First validated digest to compare.
     * @param right - Second validated digest to compare.
     * @returns True only when both valid digests contain the same bytes.
     *
     * @public
     */
    equalDigest(left: string, right: string): boolean;
}
