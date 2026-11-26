/**
 * Treats untrusted metadata as a record without admitting arrays or null.
 * @param value - External JSON metadata.
 * @returns Its object fields or an empty record for another JSON kind.
 * @public
 */
export function releaseFields(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
}
