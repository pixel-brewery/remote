// #region Imports
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
// #endregion

/**
 * Executes a bounded artifact-verification tool without invoking a shell.
 * @param command - Tool executable, including the current Node executable for probes.
 * @param args - Literal arguments passed directly to the executable.
 * @param directory - Explicit workspace or isolated-consumer working directory.
 * @param environment - Explicit environment chosen by the coordinating verifier.
 * @returns Standard output after the tool exits successfully.
 * @throws An error for a nonzero exit, timeout or output exceeding eight MiB.
 * @public
 */
export async function runPackedCommand(
    command: string,
    args: readonly string[],
    directory: string,
    environment: Readonly<NodeJS.ProcessEnv>,
): Promise<string> {
    const result = await promisify(execFile)(command, [...args], {
        cwd: directory,
        env: environment,
        encoding: 'utf8',
        timeout: 180000,
        maxBuffer: 8 * 1024 * 1024,
    });
    return result.stdout;
}
