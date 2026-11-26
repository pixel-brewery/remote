/**
 * Application-owned note projection with no dependency on any SDK device model.
 *
 * @public
 */
export interface IFixtureNote {
    /**
     * Opaque identifier generated when this note is created.
     *
     * @public
     */
    readonly id: string;
    /**
     * Validated note text, trimmed and bounded to one thousand characters.
     *
     * @public
     */
    readonly text: string;
}
