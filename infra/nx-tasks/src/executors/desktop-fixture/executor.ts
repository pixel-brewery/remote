// #region Imports
import { logger, type ExecutorContext } from '@nx/devkit';
import { buildDesktopFixture } from './buildDesktopFixture.js';
// #endregion

/**
 * Emits the desktop fixture through the maintained Nx build owner.
 *
 * @param options - No configurable build exceptions are accepted.
 * @param context - Invoking fixture project and workspace.
 * @returns Success after all real process bundles finish.
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
        if (!project) throw new Error('Desktop fixture build requires an owning Nx project.');
        await buildDesktopFixture(context.root, project.root);
        return { success: true };
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        return { success: false };
    }
}
