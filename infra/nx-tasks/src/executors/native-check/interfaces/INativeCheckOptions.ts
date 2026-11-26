/**
 * Selects a maintained Android or iOS project and its native validation action.
 *
 * @public
 */
export interface INativeCheckOptions {
    /**
     * Compiles Android, compiles an unsigned iOS simulator build or runs iOS tests.
     *
     * @public
     */
    readonly platform: 'android' | 'ios' | 'ios-test';
    /**
     * Existing Gradle tasks; defaults to the SDK's assembly and JVM contract tests.
     *
     * @public
     */
    readonly gradleTasks?: readonly string[];
    /**
     * Existing Xcode scheme; defaults to the SDK package's actual generated scheme.
     *
     * @public
     */
    readonly scheme?: string;
    /**
     * Optional application project, relative to the owning Nx project directory.
     * Swift packages omit this field.
     *
     * @public
     */
    readonly projectFile?: string;
}
