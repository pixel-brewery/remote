/**
 * Describes the npm metadata inspected from an actual packed archive.
 *
 * @public
 */
export interface IPackedPackageManifest {
    /**
     * Public npm package identity.
     * @public
     */
    readonly name: string;
    /**
     * Exact stable package version written by the packer.
     * @public
     */
    readonly version: string;
    /**
     * JavaScript module format; SDK artifacts require ESM.
     * @public
     */
    readonly type?: string;
    /**
     * Published SPDX license identifier.
     * @public
     */
    readonly license?: string;
    /**
     * Explicit published-file patterns.
     * @public
     */
    readonly files?: readonly string[];
    /**
     * Explicit public export map, validated before consumer generation.
     * @public
     */
    readonly exports?: Readonly<Record<string, unknown>>;
    /**
     * Runtime dependencies whose SDK versions and public pins are verified.
     * @public
     */
    readonly dependencies?: Readonly<Record<string, string>>;
    /**
     * Optional runtime dependencies subject to the same artifact boundaries.
     * @public
     */
    readonly optionalDependencies?: Readonly<Record<string, string>>;
    /**
     * Declared consumer peers installed at the workspace's exact public versions.
     * @public
     */
    readonly peerDependencies?: Readonly<Record<string, string>>;
}
