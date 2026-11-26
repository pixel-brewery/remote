// #region Imports
import type { IPackedArchive } from './IPackedArchive.js';
// #endregion

/**
 * Reports completed checks against real packed artifacts and their isolated consumer.
 *
 * @public
 */
export interface IPackedPackagesReport {
    /**
     * Number of SDK tarballs packed and installed in the consumer.
     * @public
     */
    readonly packages: number;
    /**
     * Number of public entries resolved and type checked.
     * @public
     */
    readonly exports: number;
    /**
     * Number of safe public entries imported in an ordinary Node process.
     * @public
     */
    readonly runtimeImports: number;
    /**
     * Present only when the caller requested retained, already verified archives.
     * @public
     */
    readonly archives?: readonly IPackedArchive[];
}
