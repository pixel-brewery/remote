// #region Imports
import { logger, type ExecutorContext } from '@nx/devkit';
import { verifySourceConventions } from './verifySourceConventions.js';
// #endregion

/**
 * Checks authored sources and the Git index against repository conventions.
 *
 * @param options - This executor accepts no configurable exceptions.
 * @param context - Nx workspace containing the production source owners.
 * @returns Success when all checked files satisfy the source conventions.
 *
 * @public
 */
export default async function execute(
    options: Readonly<Record<string, never>>,
    context: ExecutorContext,
): Promise<{ success: boolean }> {
    void options;
    try {
        const count = await verifySourceConventions(context.root);
        logger.info(`Verified source conventions for ${count} production files.`);
        return { success: true };
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        return { success: false };
    }
}
