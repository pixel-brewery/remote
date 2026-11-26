/**
 * Safe host-administration projection. No credential or token hash is included.
 *
 * @public
 */
export interface IRemoteAccessStatus {
    /**
     * Persisted activation intent. A transport may be unavailable while this value remains true.
     *
     * @public
     */
    readonly enabled: boolean;
    /**
     * Paired device metadata with credential hashes omitted from public administration projections.
     *
     * @public
     */
    readonly devices: readonly {
        /**
         * Stable identifier within the owning collection.
         */
        readonly id: string;
        /**
         * Human-readable host or device label; never interpreted as authority.
         */
        readonly name: string;
        /**
         * Exact operation capabilities granted by the application; resource-level checks remain application-owned.
         */
        readonly capabilities: readonly string[];
        /**
         * UTC instant at which the device grant was committed.
         */
        readonly pairedAt: string;
        /**
         * Optional application-maintained last-use UTC instant.
         */
        readonly lastSeenAt?: string;
    }[];
    /**
     * Consumed invitations still awaiting a successful device grant, without challenges or credentials. Host approval applies only when configured.
     *
     * @public
     */
    readonly pendingPairings: readonly {
        /**
         * Stable identifier within the owning collection.
         */
        readonly id: string;
        /**
         * User-visible name permanently bound to the first attempt consuming this challenge.
         */
        readonly deviceName: string;
        /**
         * Exclusive expiration instant in UTC ISO 8601 format.
         */
        readonly expiresAt: string;
    }[];
}
