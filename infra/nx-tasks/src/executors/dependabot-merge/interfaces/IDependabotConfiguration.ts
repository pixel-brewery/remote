// #region Imports
import type { IDependabotPostMergeWorkflow } from './IDependabotPostMergeWorkflow.js';
// #endregion

/**
 * Binds trusted automation to one repository and its actual verification policy.
 * @public
 */
export interface IDependabotConfiguration {
    /**
     * Complete GitHub repository name used for every REST operation.
     * @public
     */
    readonly repository: string;

    /**
     * Immutable numeric GitHub repository identifier.
     * @public
     */
    readonly repositoryId: number;

    /**
     * Filename of the complete read-only verification workflow.
     * @public
     */
    readonly workflowFile: string;

    /**
     * Expected display name of the verification workflow.
     * @public
     */
    readonly workflowName: string;

    /**
     * Exact successful job set required from the latest workflow attempt.
     * @public
     */
    readonly requiredJobs: readonly string[];

    /**
     * Protected status contexts; defaults to the complete required job set.
     * @public
     */
    readonly requiredChecks?: readonly string[];

    /**
     * Enables narrow reconciliation of Mosaik latest-tag lockfile root metadata.
     * @public
     */
    readonly normalizeMosaikLockRoot?: boolean;

    /**
     * Exact native dependency manifests accepted only after version-only checks.
     * Native compilation remains part of the complete required job set.
     *
     * @public
     */
    readonly nativeManifests?: readonly string[];

    /**
     * Existing source-bound workflows continued after a confirmed merge.
     * @public
     */
    readonly postMergeWorkflows?: readonly IDependabotPostMergeWorkflow[];
}
