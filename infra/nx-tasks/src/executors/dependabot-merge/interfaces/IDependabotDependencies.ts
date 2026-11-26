/**
 * Supplies replaceable REST and polling boundaries for deterministic verification.
 * @public
 */
export interface IDependabotDependencies {
    /**
     * Executes one authenticated GitHub REST operation.
     * @param method - HTTP method required by the operation.
     * @param endpoint - Repository-scoped GitHub REST endpoint.
     * @param body - Optional JSON request body.
     * @returns The decoded response payload.
     * @public
     */
    readonly request?: (method: string, endpoint: string, body?: unknown) => Promise<unknown>;

    /**
     * Waits between bounded asynchronous branch-refresh polls.
     * @returns Completion of one polling delay.
     * @public
     */
    readonly wait?: () => Promise<void>;
}
