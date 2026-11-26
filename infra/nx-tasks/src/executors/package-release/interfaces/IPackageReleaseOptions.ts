/**
 * Selects an explicit manual release operation without changing source versions.
 *
 * @public
 */
export interface IPackageReleaseOptions {
    /**
     * Read-only source check, retained preparation, authorized upload, or public verification.
     * Defaults to preflight and never infers publication from another operation.
     * @public
     */
    readonly phase?: 'preflight' | 'prepare' | 'publish' | 'verify';
    /**
     * Full source commit, required to equal the current protected main throughout.
     * @public
     */
    readonly sourceSha: string;
    /**
     * Exact stable version already committed in every SDK package and root manifest.
     * @public
     */
    readonly familyVersion: string;
    /**
     * Explicit candidate directory; defaults to out/package-release for local preparation.
     * @public
     */
    readonly artifactDirectory?: string;
    /**
     * Positive GitHub Actions artifact ID from upload-artifact, never a local hash
     * or filename. Required for publish/verify and cross-run retained resumption.
     * @public
     */
    readonly artifactId?: number;
}
