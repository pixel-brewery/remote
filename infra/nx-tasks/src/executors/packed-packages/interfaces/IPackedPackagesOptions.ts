/**
 * Controls retention after the single canonical artifact verification succeeds.
 *
 * @public
 */
export interface IPackedPackagesOptions {
    /**
     * Optional new output directory for the same checked tarballs. Existing
     * directories are rejected; default verification retains no artifacts.
     * @public
     */
    readonly retainDirectory?: string;
}
