// #region Imports
import { logger, type ExecutorContext } from '@nx/devkit';
import type { INativeCheckOptions } from './interfaces/INativeCheckOptions.js';
import { runNativeCheck } from './runNativeCheck.js';
// #endregion

/**
 * Runs the native validation owned by the invoking Nx project.
 *
 * @param options - Platform and explicit project compile/test configuration.
 * @param context - Resolved Nx project graph and workspace root.
 * @returns Success only after the native compiler or simulator tests complete.
 *
 * @public
 */
export default async function execute(
    options: INativeCheckOptions,
    context: ExecutorContext,
): Promise<{ success: boolean }> {
    try {
        const project =
            context.projectName && context.projectsConfigurations?.projects[context.projectName];
        if (!project) throw new Error('Native validation requires an owning Nx project.');
        await runNativeCheck(context.root, project.root, options);
        return { success: true };
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        return { success: false };
    }
}
