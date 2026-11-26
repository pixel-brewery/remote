/**
 * On-device scanner result awaiting canonical invitation validation.
 * @public
 */
export interface IRemoteCapacitorScanResult {
    /**
     * Short-lived QR invitation material; excludes persisted device credentials.
     * @public
     */
    readonly bootstrap: unknown;
}
