// #region Imports
import { logger, type ExecutorContext } from '@nx/devkit';
import { appendFile } from 'node:fs/promises';
import type { IPackageReleaseOptions } from './interfaces/IPackageReleaseOptions.js';
import { runPackageRelease } from './runPackageRelease.js';
// #endregion

/**
 * Exposes the single manual publication coordinator through its typed Nx contract.
 * @param options - Explicit phase, exact source/version and retained artifact identity.
 * @param context - Current workspace; prerequisite builds belong only to preparation.
 * @returns Success only after the selected real proof/preparation/publication completes.
 * @public
 */
export default async function execute(
    options: IPackageReleaseOptions,
    context: ExecutorContext,
): Promise<{ success: boolean }> {
    try {
        const report = await runPackageRelease(context.root, options);
        if (
            process.env['GITHUB_OUTPUT'] &&
            typeof report['artifactRunId'] === 'number' &&
            Number.isSafeInteger(report['artifactRunId'])
        )
            await appendFile(
                process.env['GITHUB_OUTPUT'],
                'artifact_run_id=' + String(report['artifactRunId']) + '\n',
            );
        logger.info(JSON.stringify(report));
        return { success: true };
    } catch (error) {
        logger.error(
            error instanceof Error ? error.message : 'Package release could not be completed.',
        );
        return { success: false };
    }
}
