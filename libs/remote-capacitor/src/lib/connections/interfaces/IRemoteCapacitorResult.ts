/**
 * Untrusted plugin reply awaiting canonical native-response validation.
 * @public
 */
export interface IRemoteCapacitorResult {
    /**
     * Canonical connection-list, local-view or completion payload before schema parsing.
     * @public
     */
    readonly response: unknown;
}
