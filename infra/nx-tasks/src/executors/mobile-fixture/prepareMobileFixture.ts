// #region Imports
import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
// #endregion

/**
 * Packages the one shared fixture interface into the native reference host.
 *
 * @remarks Nx schedules the browser build first. Only this application's
 * replaceable dist directory is removed; no native state or SDK cache is reset.
 *
 * @param workspace - Nx workspace root.
 * @param projectRoot - Configured mobile fixture application directory.
 * @returns Completion after the packaged interface assets have been copied.
 * @throws A filesystem failure when the declared browser output is unavailable.
 *
 * @public
 */
export async function prepareMobileFixture(workspace: string, projectRoot: string): Promise<void> {
    const root = resolve(workspace, projectRoot);
    const output = resolve(root, 'dist');
    await rm(output, { recursive: true, force: true });
    await mkdir(output, { recursive: true });
    await cp(resolve(workspace, 'apps/fixture-browser/dist'), output, { recursive: true });
}
