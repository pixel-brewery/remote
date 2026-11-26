// #region Imports
import type { IPackedPackageDefinition } from './interfaces/IPackedPackageDefinition.js';
// #endregion

/**
 * Defines all nine publication owners and their permitted inward SDK dependencies.
 * @returns The complete artifact plan; privileged and browser adapters are type checked only.
 * @public
 */
export function getPackedPackageDefinitions(): readonly IPackedPackageDefinition[] {
    const name = (value: string): string => `@pixel-brewery/remote-${value}`;
    const entry = (
        value: string,
        dependencies: readonly string[],
        portable: boolean,
        runtime: boolean,
    ): IPackedPackageDefinition => ({
        name: name(value),
        directory: `libs/remote-${value}`,
        sdkDependencies: dependencies.map(name),
        portable,
        nodeImports: ['node', 'electron', 'testing'].includes(value),
        runtime,
    });
    return [
        entry('protocol', [], true, true),
        entry('core', ['protocol'], true, true),
        entry('client', ['protocol'], true, true),
        entry('browser', ['client', 'protocol'], false, false),
        entry('angular', ['client'], false, false),
        entry('node', ['client', 'core', 'protocol'], false, true),
        entry('electron', ['client', 'node', 'protocol'], false, false),
        entry('capacitor', ['browser', 'client', 'protocol'], false, false),
        entry('testing', ['client', 'core', 'protocol'], false, true),
    ];
}
