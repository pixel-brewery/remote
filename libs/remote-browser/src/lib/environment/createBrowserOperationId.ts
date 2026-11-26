/**
 * Generate a UUID-shaped operation identifier in an HTTP LAN browser.
 * @param cryptography - Browser crypto port supporting getRandomValues in insecure contexts.
 * @returns Random version-four identifier without requiring crypto.randomUUID.
 * @public
 */
export function createBrowserOperationId(cryptography: Pick<Crypto, 'getRandomValues'>): string {
    const bytes = cryptography.getRandomValues(new Uint8Array(16));
    bytes[6] = ((bytes[6] ?? 0) & 15) | 64;
    bytes[8] = ((bytes[8] ?? 0) & 63) | 128;
    const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
