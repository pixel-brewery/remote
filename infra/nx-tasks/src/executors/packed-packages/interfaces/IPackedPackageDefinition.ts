/**
 * Defines one SDK artifact and its permitted inward dependency direction.
 *
 * @public
 */
export interface IPackedPackageDefinition {
    /**
     * Full public npm package name.
     * @public
     */
    readonly name: string;
    /**
     * Owning library directory relative to the workspace root.
     * @public
     */
    readonly directory: string;
    /**
     * Complete allowed direct SDK dependency set.
     * @public
     */
    readonly sdkDependencies: readonly string[];
    /**
     * Rejects platform and Node imports for the portable protocol, core and client.
     * @public
     */
    readonly portable: boolean;
    /**
     * Allows Node builtins only for the Node, Electron and testing owners.
     * @public
     */
    readonly nodeImports: boolean;
    /**
     * Allows ordinary Node to import this artifact's executable public entries.
     * @public
     */
    readonly runtime: boolean;
}
