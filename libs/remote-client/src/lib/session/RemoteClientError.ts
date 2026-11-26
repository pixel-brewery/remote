/**
 * Stable client failure classification without transport-specific exceptions or credentials.
 * @remarks A lost mutation is OUTCOME_UNKNOWN and must be reconciled before a user retries it.
 * @public
 */
export class RemoteClientError extends Error {
    // #region Ctor
    /**
     * Create an actionable credential-free failure.
     * @param code - Machine-readable lifecycle or transport classification.
     * @param message - Safe explanation suitable for the owning application.
     * @public
     */
    public constructor(
        public readonly code:
            | 'CONNECTION_CLOSED'
            | 'HOST_MISMATCH'
            | 'UNSUPPORTED_PROTOCOL'
            | 'SESSION_REQUIRED'
            | 'OUTCOME_UNKNOWN'
            | 'TRANSPORT_FAILED'
            | 'INVALID_BOOTSTRAP',
        message: string,
    ) {
        super(message);
        this.name = 'RemoteClientError';
    }
    // #endregion
}
