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
     * Authorizes one source-reviewed native CI run using an isolated minimal-scope caller.
     *
     * @param number - Exact eligible Dependabot pull-request number in the configured repository.
     * @returns Approval completion or an explicit waiting/skipped outcome; never a branch mutation or merge.
     * @throws Error when metadata cannot be read or the fixed trusted review policy is invalid.
     * @public
     */
    authorize(number: number): Promise<unknown>;

    /**
     * Reconciles bounded bot pull requests selected by a trusted workflow event.
     * @param mode - Reconciliation may mutate branches and merge; authorization only reads and approves native CI.
     * @returns Outcomes for the selected pull requests.
     * @throws Error for an unsupported mode/context, invalid metadata or an aggregated per-PR failure.
     * @public
     */
    runFromEnvironment(mode?: 'reconcile' | 'authorize'): Promise<readonly unknown[]>;
}
