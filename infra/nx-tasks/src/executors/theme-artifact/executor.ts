// #region Imports
import { logger, type ExecutorContext } from '@nx/devkit';
import { generateRemoteThemes } from './generateRemoteThemes.js';
import type { IThemeArtifactOptions } from './interfaces/IThemeArtifactOptions.js';
// #endregion

/**
 * Generates or verifies the fixture's exact pinned Soho theme and indigo palettes.
 *
 * @param options - Explicit artifact write or check operation.
 * @param context - Nx workspace that owns the generated fixture resource.
 * @returns Success after public runtime generation and artifact verification.
 *
 * @public
 */
export default async function execute(
    options: IThemeArtifactOptions,
    context: ExecutorContext,
): Promise<{ success: boolean }> {
    try {
        await generateRemoteThemes(context.root, options.mode);
        logger.info('Verified the fixture theme from the pinned Mosaik runtime.');
        return { success: true };
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        return { success: false };
    }
}
