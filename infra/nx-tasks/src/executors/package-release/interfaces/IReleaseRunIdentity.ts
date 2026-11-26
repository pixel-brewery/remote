/**
 * Identifies one actual manual workflow attempt without trusting event claims alone.
 *
 * @public
 */
export interface IReleaseRunIdentity {
    /**
     * Positive canonical Actions run identifier.
     * @public
     */
    readonly runId: number;
    /**
     * Positive current run attempt.
     * @public
     */
    readonly attempt: number;
    /**
     * Immutable artifact explicitly selected in a manual dispatch, when supplied.
     * An omitted value requires publication from that same run's preparation.
     * @public
     */
    readonly artifactId?: number;
}
