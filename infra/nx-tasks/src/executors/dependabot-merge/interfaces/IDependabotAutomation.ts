/**
 * Exposes the trusted dependency-reconciliation entry points.
 * @public
 */
export interface IDependabotAutomation {
    /**
     * Reconciles a single bot pull request against its current base and exact head.
     * @param number - Positive GitHub pull-request number in the configured repository.
     * @returns The verified reconciliation outcome.
     * @public
     */
    reconcile(number: number): Promise<unknown>;

    /**
     * Reconciles bounded bot pull requests selected by a trusted workflow event.
     * @returns Outcomes for the selected pull requests.
     * @public
     */
    runFromEnvironment(): Promise<readonly unknown[]>;
}
