/**
 * Identifies a packed export that the isolated consumer must actually resolve.
 *
 * @public
 */
export interface IPackedExport {
    /**
     * Full bare package specifier accepted by a consumer.
     * @public
     */
    readonly specifier: string;
    /**
     * Whether the export is JSON metadata instead of a TypeScript API.
     * @public
     */
    readonly json: boolean;
    /**
     * Whether an ordinary Node process can safely execute this export.
     * @public
     */
    readonly runtime: boolean;
}
