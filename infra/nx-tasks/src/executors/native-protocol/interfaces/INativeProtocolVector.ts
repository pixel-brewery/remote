/**
 * Describes one shared native-validator acceptance or rejection example.
 *
 * @typeParam TSchemaName - Canonical schema name from the generated contract.
 * @public
 */
export interface INativeProtocolVector<TSchemaName extends string> {
    /**
     * Canonical schema that must validate the example.
     *
     * @public
     */
    readonly schema: TSchemaName;
    /**
     * Stable descriptive case name reported on a conformance failure.
     *
     * @public
     */
    readonly name: string;
    /**
     * Whether the schema and its semantic refinements must accept the value.
     *
     * @public
     */
    readonly valid: boolean;
    /**
     * Untrusted JSON value supplied to the validator without preprocessing.
     *
     * @public
     */
    readonly value: unknown;
}
