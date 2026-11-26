/**
 * Reserved device-protocol routes. Product routes remain application-owned.
 *
 * @public
 */
export const remoteRoutes = Object.freeze({
    /**
     * GET public bounded host identity. Local native gateways require their own ephemeral session before serving this projection.
     */
    host: '/__remote/v1/host',
    /**
     * POST one canonical pairing attempt. Cookie or bearer delivery is selected explicitly; native loopback gateways do not expose this operation.
     */
    pairings: '/__remote/v1/pairings',
    /**
     * GET the current device projection or DELETE its durable grant. Every request requires the corresponding device or protected local session.
     */
    session: '/__remote/v1/session',
});
