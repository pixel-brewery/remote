/**
 * Clock and scheduler supplied by the host environment.
 * @public
 */
export interface IRemoteClientClock {
    /**
     * Return the current Unix time in milliseconds.
     * @returns Current Unix timestamp in milliseconds.
     * @public
     */
    now(): number;
    /**
     * Schedule one callback and return its cancellation function.
     * @param callback - One callback invoked when the scheduler delay elapses.
     * @param delayMilliseconds - Nonnegative delay before the callback may run.
     * @returns Idempotent cancellation function for the scheduled callback.
     * @public
     */
    schedule(callback: () => void, delayMilliseconds: number): () => void;
}
