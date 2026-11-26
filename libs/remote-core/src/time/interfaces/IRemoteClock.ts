/**
 * Injected instant clock; expiration uses UTC epoch milliseconds.
 *
 * @public
 */
export interface IRemoteClock {
    /**
     * Returns the injected current UTC instant in epoch milliseconds.
     *
     * @returns The injected Unix time in milliseconds.
     *
     * @public
     */
    now(): number;
}
