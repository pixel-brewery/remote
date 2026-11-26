/**
 * Describes one public package entry point and its temporary reference outputs.
 *
 * @public
 */
export interface IEntryOptions {
    /**
     * Absolute workspace root used to remove machine-specific reflection paths.
     *
     * @public
     */
    readonly root: string;
    /**
     * Temporary directory owned and cleaned up by the reference generation task.
     *
     * @public
     */
    readonly staging: string;
    /**
     * Consumer-facing package import path used as the reference title.
     *
     * @public
     */
    readonly importPath: string;
    /**
     * Absolute TypeScript source path for this package export.
     *
     * @public
     */
    readonly source: string;
    /**
     * TypeScript project used by both the package build and TypeDoc.
     *
     * @public
     */
    readonly config: string;
    /**
     * Markdown output directory relative to the task's staging root.
     *
     * @public
     */
    readonly markdown: string;
    /**
     * JSON reflection file relative to the task's staging root.
     *
     * @public
     */
    readonly reflection: string;
}
