/**
 * Identifies the exact verified bytes retained for publication without repacking.
 *
 * @public
 */
export interface IPackedArchive {
    /**
     * Canonical SDK package name.
     * @public
     */
    readonly name: string;
    /**
     * Authored stable version shared by the entire SDK family.
     * @public
     */
    readonly version: string;
    /**
     * Simple tarball filename inside the retained candidate directory.
     * @public
     */
    readonly file: string;
    /**
     * Exact compressed archive size in bytes.
     * @public
     */
    readonly bytes: number;
    /**
     * Lowercase SHA-256 digest of the exact compressed bytes.
     * @public
     */
    readonly sha256: string;
    /**
     * Standard SHA-512 subresource-integrity value for registry comparison.
     * @public
     */
    readonly integrity: string;
}
