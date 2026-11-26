// #region Imports
import type { IRemoteErrorCode } from './interfaces/IRemoteErrorCode.js';
// #endregion
/**
 * A controlled protocol failure safe to project across a trust boundary.
 *
 * @public
 */
export class RemoteProtocolError extends Error {
    // #region Fields
    /**
     * Stable failure code.
     *
     * @public
     */
    public readonly code: IRemoteErrorCode;
    // #endregion
    // #region Ctor
    /**
     * Creates a safe failure without serializing an internal cause.
     *
     * @param code - Stable protocol failure category.
     * @param message - Safe public explanation without internal causes, credentials or private payloads.
     * @public
     */
    public constructor(code: IRemoteErrorCode, message: string) {
        super(message);
        this.name = 'RemoteProtocolError';
        this.code = code;
    }
    // #endregion
}
