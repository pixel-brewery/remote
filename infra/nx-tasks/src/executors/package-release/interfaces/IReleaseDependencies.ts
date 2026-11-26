// #region Imports
import type { IPackedCommandRunner } from '../../packed-packages/interfaces/IPackedCommandRunner.js';
import type { IReleaseRequest } from './IReleaseRequest.js';
// #endregion

/**
 * Injects official tools and API evidence without executing real writes in unit checks.
 *
 * @public
 */
export interface IReleaseDependencies {
    /**
     * Literal external-tool boundary for Git, Yarn, tar, TypeScript and npm.
     * @public
     */
    readonly command: IPackedCommandRunner;
    /**
     * Actual metadata/tag boundary, or its deterministic unit replacement.
     * @public
     */
    readonly request: IReleaseRequest;
    /**
     * Trusted bootstrap context; credential values are never reported.
     * @public
     */
    readonly environment: Readonly<NodeJS.ProcessEnv>;
}
