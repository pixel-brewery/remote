// #region Imports
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { build } from 'vite';
// #endregion

/**
 * Generates the fixture and portfolio themes through the public Mosaik runtime.
 *
 * @remarks The published theme declaration currently imports an unrelated full
 * component barrel. Bundling the public runtime at this development boundary
 * preserves its exact Soho data and palette generator without importing those
 * declarations into the strict application compilation. No dependency is patched.
 * The real Theme2Element remains responsible for rendering the generated data.
 *
 * @param workspace - Nx workspace containing the pinned theme dependency.
 * @param mode - Writes the owned JSON artifact or checks for source drift.
 * @returns Completion after the complete JSON artifact is written or verified.
 * @throws A dependency, theme generation or stale-artifact failure.
 *
 * @public
 */
export async function generateRemoteThemes(
    workspace: string,
    mode: 'write' | 'check',
): Promise<void> {
    const entry = 'virtual:remote-fixture-theme';
    const result = await build({
        root: workspace,
        configFile: false,
        logLevel: 'error',
        plugins: [
            {
                name: 'remote-fixture-theme',
                resolveId(id) {
                    return id === entry || id === resolve(workspace, entry) ? '\0' + entry : null;
                },
                load(id) {
                    if (id !== '\0' + entry) return null;
                    return `import { SohoTheme, ThemeGenerator } from '@pixel-brewery/mosaik-themes';
const base = SohoTheme.SOHO_THEME;
const generator = new ThemeGenerator();
export default { ...base, palette: {
light: { ...base.palette.light, primary: generator.generatePalette('soho', '#5B4BDB', 'light') },
dark: { ...base.palette.dark, primary: generator.generatePalette('soho', '#5B4BDB', 'dark') }
} };`;
                },
            },
        ],
        build: {
            write: false,
            minify: false,
            lib: { entry, formats: ['es'] },
        },
    });
    const outputs = (Array.isArray(result) ? result : [result]).flatMap((value) =>
        'output' in value ? value.output : [],
    );
    const chunks = outputs.filter((value) => value.type === 'chunk');
    if (chunks.length !== 1 || chunks[0]!.imports.length || chunks[0]!.dynamicImports.length)
        throw new Error('The fixture theme must be a single self-contained runtime artifact.');
    const module = (await import(
        'data:text/javascript;base64,' + Buffer.from(chunks[0]!.code).toString('base64')
    )) as { default: unknown };
    const theme = module.default;
    if (!isRecord(theme) || !isRecord(theme.scheme) || !isRecord(theme.scheme.light))
        throw new Error('The public Mosaik theme did not produce the required scheme object.');
    const artifacts = [
        { path: 'apps/fixture-browser/src/theme/fixtureTheme.json', value: theme },
        {
            path: 'site/theme/remoteTheme.json',
            value: {
                ...theme,
                scheme: {
                    ...theme.scheme,
                    light: { ...theme.scheme.light, background: '#fbf9f6', surface: '#f3ede7' },
                },
            },
        },
    ];
    for (const artifact of artifacts) {
        const content = JSON.stringify(artifact.value, null, 4) + '\n';
        if (content.length > 1024 * 1024)
            throw new Error('The public Mosaik theme exceeds its JSON artifact budget.');
        const file = resolve(workspace, artifact.path);
        if (mode === 'check') {
            if ((await readFile(file, 'utf8')) !== content)
                throw new Error(
                    `The generated theme ${artifact.path} is stale. Run yarn theme:generate.`,
                );
        } else {
            await mkdir(dirname(file), { recursive: true });
            await writeFile(file, content);
        }
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
