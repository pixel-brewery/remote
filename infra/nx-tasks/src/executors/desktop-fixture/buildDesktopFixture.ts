// #region Imports
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'vite';
// #endregion

/**
 * Builds the Electron acceptance host's isolated process entry points.
 *
 * @remarks Main and Utility remain ESM. The sandboxed preload is one bundled
 * CommonJS file whose only external capability is Electron's preload API.
 *
 * @param workspace - Nx workspace root.
 * @param projectRoot - Configured fixture application directory.
 * @returns Completion after both process bundles and the preload are emitted.
 * @throws A Vite or filesystem failure without claiming a usable fixture.
 *
 * @public
 */
export async function buildDesktopFixture(workspace: string, projectRoot: string): Promise<void> {
    const root = resolve(workspace, projectRoot);
    await mkdir(resolve(root, 'dist'), { recursive: true });
    await build({
        root,
        configFile: false,
        build: {
            ssr: true,
            outDir: 'dist',
            emptyOutDir: true,
            rollupOptions: {
                input: {
                    main: resolve(root, 'src/main.ts'),
                    utility: resolve(root, 'src/utility.ts'),
                },
                external: [/^node:/, 'electron', /^@pixel-brewery\//, 'zod'],
                output: { entryFileNames: '[name].js', format: 'es' },
            },
        },
    });
    await build({
        root,
        configFile: false,
        build: {
            outDir: 'dist',
            emptyOutDir: false,
            lib: {
                entry: resolve(root, 'src/preload.ts'),
                formats: ['cjs'],
                fileName: () => 'preload.cjs',
            },
            rollupOptions: { external: ['electron'] },
            minify: false,
        },
    });
}
