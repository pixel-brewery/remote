/**
 * One deterministic scheduler entry retained by FakeRemoteClock.
 *
 * @internal
 */
export interface IRemoteScheduledCallback {
    /**
     * Absolute injected UTC epoch deadline in milliseconds.
     *
     * @public
     */
    readonly at: number;
    /**
     * Callback invoked once if the entry is not canceled before its deadline.
     *
     * @public
     */
    readonly callback: () => void;
}
