/**
 * Resolves a literal SDK entry point to matching emitted declarations and ESM.
 *
 * @public
 */
export interface IPackageExport {
    /**
     * Declaration file relative to the package directory.
     *
     * @public
     */
    readonly types?: string;
    /**
     * ESM file used for import resolution.
     *
     * @public
     */
    readonly import?: string;
    /**
     * Optional default resolution when the manifest has no import condition.
     *
     * @public
     */
    readonly default?: string;
}
