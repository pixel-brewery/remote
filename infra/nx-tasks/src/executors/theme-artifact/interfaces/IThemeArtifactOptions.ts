/**
 * Selects generation or drift validation of the shared fixture theme.
 *
 * @public
 */
export interface IThemeArtifactOptions {
    /**
     * Writes the owned JSON artifact or verifies its exact current value.
     *
     * @public
     */
    readonly mode: 'write' | 'check';
}
