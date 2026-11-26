/**
 * Selects whether the API reference is regenerated or compared without writes.
 *
 * @public
 */
export interface IApiDocsOptions {
    /**
     * Writes owned API directories or fails when their committed contents drift.
     *
     * @public
     */
    readonly mode: 'write' | 'check';
}
