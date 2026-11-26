/**
 * Resource bounds of a serialized host runtime.
 *
 * @public
 */
export interface IRemoteHostRuntimeOptions {
    /**
     * Maximum running plus queued operations, default 16 and at most 1024; further commands fail with `resource-limit`.
     *
     * @public
     */
    readonly maxPendingOperations?: number;
}
