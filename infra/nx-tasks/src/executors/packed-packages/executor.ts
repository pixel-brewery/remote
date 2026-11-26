// #region Imports
import { logger, type ExecutorContext } from '@nx/devkit';
import { verifyPackedPackages } from './verifyPackedPackages.js';
// #endregion

/**
 * Verifies actual publication artifacts through a credential-free isolated consumer.
 * @param options - This verification accepts no bypass or workspace-resolution options.
 * @param context - Nx workspace owning all nine SDK packages and prerequisite builds.
 * @returns Success only after metadata, graph, strict types and runtime imports pass.
 * @public
 */
export default async function execute(
    options: Readonly<Record<string, never>>,
    context: ExecutorContext,
): Promise<{ success: boolean }> {
    void options;
    try {
        const report = await verifyPackedPackages(context.root);
        logger.info(
            `Verified ${report.packages} packed SDK packages, ${report.exports} public exports and ${report.runtimeImports} safe Node imports.`,
        );
        return { success: true };
    } catch (error) {
        logger.error(error instanceof Error ? error.message : String(error));
        return { success: false };
    }
}
