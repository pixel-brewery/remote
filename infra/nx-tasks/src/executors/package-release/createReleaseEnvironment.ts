/**
 * Creates a minimal tool environment without inherited runtime/config injections.
 * @param source - Bootstrap environment; secrets are excluded by default.
 * @returns Selected ordinary process paths and platform settings only.
 * @public
 */
export function createReleaseEnvironment(source: Readonly<NodeJS.ProcessEnv>): NodeJS.ProcessEnv {
    const result: NodeJS.ProcessEnv = {};
    for (const key of [
        'PATH',
        'HOME',
        'LANG',
        'LC_ALL',
        'TMPDIR',
        'TEMP',
        'TMP',
        'SystemRoot',
        'SYSTEMROOT',
        'WINDIR',
        'COMSPEC',
        'PATHEXT',
        'USERPROFILE',
        'COREPACK_HOME',
    ])
        if (source[key] !== undefined) result[key] = source[key];
    return result;
}
