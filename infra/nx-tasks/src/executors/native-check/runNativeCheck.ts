// #region Imports
import { execFile, spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import type { INativeCheckOptions } from './interfaces/INativeCheckOptions.js';
import { selectSimulatorDestination } from './selectSimulatorDestination.js';
// #endregion

/**
 * Executes native validation through the selected project's official toolchain.
 *
 * @param workspace - Nx workspace root.
 * @param projectRoot - Owning project's configured relative directory.
 * @param options - Explicit platform, scheme and compile/test operation.
 * @returns Completion after the actual compiler or simulator test process exits.
 * @throws A configuration, toolchain or native validation failure.
 *
 * @public
 */
export async function runNativeCheck(
    workspace: string,
    projectRoot: string,
    options: INativeCheckOptions,
): Promise<void> {
    const root = resolve(workspace, projectRoot);
    const projectRelative = relative(workspace, root);
    if (
        isAbsolute(projectRoot) ||
        projectRelative === '..' ||
        projectRelative.startsWith(`..${sep}`)
    )
        throw new Error('Native validation must belong to the configured workspace project.');
    if (options.platform === 'android') {
        const tasks = options.gradleTasks ?? ['assembleDebug', 'testDebugUnitTest'];
        if (!tasks.length || tasks.some((task) => !/^[A-Za-z][A-Za-z0-9:]*$/.test(task)))
            throw new Error('Invalid native Gradle task selection.');
        await run(
            process.env['GRADLE_BIN'] ?? 'gradle',
            ['--project-dir', resolve(root, 'android'), '--no-daemon', '--max-workers=1', ...tasks],
            root,
        );
        return;
    }
    const scheme = options.scheme ?? 'PixelBreweryRemote-Package';
    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(scheme)) throw new Error('Invalid Xcode scheme.');
    const output = resolve(root, '.local', 'ios');
    await mkdir(output, { recursive: true });
    let destination = process.env['REMOTE_IOS_DESTINATION'] ?? 'generic/platform=iOS Simulator';
    if (options.platform === 'ios-test' && destination.startsWith('generic/')) {
        const { stdout } = await promisify(execFile)(
            'xcrun',
            ['simctl', 'list', 'devices', 'available', '--json'],
            { encoding: 'utf8' },
        );
        destination = selectSimulatorDestination(JSON.parse(stdout) as unknown);
    }
    const projectArguments: string[] = [];
    if (options.projectFile) {
        const project = resolve(root, options.projectFile);
        const projectFileRelative = relative(root, project);
        if (
            isAbsolute(options.projectFile) ||
            projectFileRelative === '..' ||
            projectFileRelative.startsWith(`..${sep}`) ||
            !project.endsWith('.xcodeproj')
        )
            throw new Error('The Xcode project must remain inside its owning Nx project.');
        projectArguments.push('-project', project);
    }
    await run(
        'xcodebuild',
        [
            '-quiet',
            ...projectArguments,
            '-scheme',
            scheme,
            '-destination',
            destination,
            '-derivedDataPath',
            output,
            '-clonedSourcePackagesDirPath',
            resolve(root, '.local', 'swift-packages'),
            'CODE_SIGNING_ALLOWED=NO',
            options.platform === 'ios-test' ? 'test' : 'build',
        ],
        root,
    );
}

async function run(command: string, arguments_: readonly string[], cwd: string): Promise<void> {
    await new Promise<void>((done, reject) => {
        const child = spawn(command, arguments_, { cwd, stdio: 'inherit', env: process.env });
        const stop = () => {
            child.kill('SIGTERM');
        };
        const cleanup = () => {
            process.off('SIGINT', stop);
            process.off('SIGTERM', stop);
        };
        process.on('SIGINT', stop);
        process.on('SIGTERM', stop);
        child.once('error', (error) => {
            cleanup();
            reject(error);
        });
        child.once('exit', (code, signal) => {
            cleanup();
            if (code === 0) done();
            else reject(new Error(`Native validation failed (${signal ?? code}).`));
        });
    });
}
