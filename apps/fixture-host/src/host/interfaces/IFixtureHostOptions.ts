/**
 * Application composition used by browser, desktop and native fixture journeys.
 *
 * @public
 */
export interface IFixtureHostOptions {
    /**
     * Selects one independent product adapter and its own identity namespace.
     *
     * @public
     */
    readonly kind: 'notes' | 'counter';
    /**
     * App-owned private authorization file, unique to this fixture installation.
     *
     * @public
     */
    readonly storagePath: string;
    /**
     * Stable installation identifier. Defaults to fixture-installation.
     *
     * @public
     */
    readonly hostId?: string;
    /**
     * Packaged browser assets served by the host; omitted for API-only tests.
     *
     * @public
     */
    readonly assetsPath?: string;
    /**
     * Numeric selected private interface. Test-loopback usage requires the explicit flag.
     *
     * @public
     */
    readonly host?: string;
    /**
     * First private port. Zero is available only with the explicit test policy.
     *
     * @public
     */
    readonly port?: number;
    /**
     * Explicit loopback-only test exception, never enabled by the standalone LAN launcher.
     *
     * @public
     */
    readonly allowLoopbackForTests?: boolean;
}
