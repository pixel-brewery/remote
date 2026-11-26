// #region Imports

import { logger, type ExecutorContext } from '@nx/devkit';
import { generateReference } from './generateReference.js';
import type { IApiDocsOptions } from './interfaces/IApiDocsOptions.js';

// #endregion

/**
 * Runs the SDK reference generator against the current Nx workspace.
 *
 * @param options - Whether to write the reference or check its generated contents.
 * @param context - The resolved Nx workspace and project graph.
 * @returns The Nx task result. Conversion and drift errors fail the task.
 *
 * @public
 */
export default async function execute(
    options: IApiDocsOptions,
    context: ExecutorContext,
): Promise<{ success: boolean }> {
    try {
        const count = await generateReference(context.root, options.mode);
        logger.info(`Verified API documentation for ${count} Remote entry points.`);
        return { success: true };
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        return { success: false };
    }
}
