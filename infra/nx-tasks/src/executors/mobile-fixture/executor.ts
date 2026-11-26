// #region Imports
import { logger, type ExecutorContext } from '@nx/devkit';
import { prepareMobileFixture } from './prepareMobileFixture.js';
// #endregion

/**
 * Prepares the native host's shared packaged application assets.
 *
 * @param options - No independent asset source overrides are accepted.
 * @param context - Invoking native fixture project and workspace.
 * @returns Success only after the declared browser output is copied completely.
 *
 * @public
 */
export default async function execute(
    options: Readonly<Record<string, never>>,
    context: ExecutorContext,
): Promise<{ success: boolean }> {
    void options;
    try {
        const project =
            context.projectName && context.projectsConfigurations?.projects[context.projectName];
        if (!project) throw new Error('Mobile fixture packaging requires an owning Nx project.');
        await prepareMobileFixture(context.root, project.root);
        return { success: true };
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        return { success: false };
    }
}
