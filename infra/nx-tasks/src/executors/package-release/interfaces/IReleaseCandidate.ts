// #region Imports
import type { IPackedArchive } from '../../packed-packages/interfaces/IPackedArchive.js';
import type { IPackedPackagesReport } from '../../packed-packages/interfaces/IPackedPackagesReport.js';
// #endregion

/**
 * Binds the complete checked family to one source and its immutable Actions producer.
 *
 * @public
 */
export interface IReleaseCandidate {
    /**
     * Candidate manifest format discriminator.
     * @public
     */
    readonly format: 1;
    /**
     * Canonical repository identity, independent of mutable names.
     * @public
     */
    readonly repositoryId: 1472760702;
    /**
     * Exact checked source commit.
     * @public
     */
    readonly sourceSha: string;
    /**
     * Authored stable family version.
     * @public
     */
    readonly familyVersion: string;
    /**
     * Manual Actions run that prepared and uploaded these bytes; zero identifies
     * an unpublishable local preview rather than an invented workflow producer.
     * @public
     */
    readonly producerRunId: number;
    /**
     * Exact successful preparation attempt, retained across later job retries;
     * zero applies only to an unpublishable local preview.
     * @public
     */
    readonly producerAttempt: number;
    /**
     * Completed canonical archive/isolated-consumer evidence.
     * @public
     */
    readonly verification: IPackedPackagesReport;
    /**
     * Exactly nine checked tarballs, never paths or scripts from another source.
     * @public
     */
    readonly archives: readonly IPackedArchive[];
}
