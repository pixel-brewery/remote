/**
 * Executes the real external-tool boundary or a deterministic verification double.
 *
 * @public
 */
export interface IPackedCommandRunner {
    /**
     * Runs one bounded command without shell interpolation.
     * @param command - Executable resolved through the supplied environment.
     * @param args - Literal command arguments.
     * @param directory - Explicit working directory owned by the task.
     * @param environment - Explicit process environment without consumer credentials.
     * @returns The command's standard output after successful completion.
     * @throws An error when the command fails, times out or exceeds its output bound.
     * @public
     */
    (
        command: string,
        args: readonly string[],
        directory: string,
        environment: Readonly<NodeJS.ProcessEnv>,
    ): Promise<string>;
}
