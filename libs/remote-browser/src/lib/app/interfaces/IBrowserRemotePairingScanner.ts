/**
 * Optional real native camera capability that reads one pairing invitation.
 *
 * @remarks Supply it only when the platform actually provides a scanner, such as the Capacitor bridge.
 * @public
 */
export interface IBrowserRemotePairingScanner {
    /**
     * Present the platform scanner and return the scanned invitation.
     *
     * @returns Untrusted scanned value; the gate validates it as a canonical pairing bootstrap.
     * @throws Error on user cancellation, permission denial or an unreadable code.
     * @public
     */
    scanPairing(): Promise<unknown>;
}
