// #region Imports
import type { IPackageExport } from './IPackageExport.js';
// #endregion

/**
 * Provides the package metadata consumed by API-reference generation.
 *
 * @public
 */
export interface IPackageManifest {
    /**
     * Published package name used for stable consumer import paths.
     *
     * @public
     */
    readonly name: string;
    /**
     * Package version recorded in the generated API index.
     *
     * @public
     */
    readonly version: string;
    /**
     * Public entry points; package metadata exports may use literal filenames.
     *
     * @public
     */
    readonly exports?: Readonly<Record<string, IPackageExport | string>>;
}
