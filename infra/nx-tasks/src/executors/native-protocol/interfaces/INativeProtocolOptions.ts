/**
 * Selects generation or read-only drift verification of native wire contracts.
 *
 * @public
 */
export interface INativeProtocolOptions {
    /**
     * Writes both native resources or requires both to match their source.
     *
     * @public
     */
    readonly mode: 'write' | 'check';
}
