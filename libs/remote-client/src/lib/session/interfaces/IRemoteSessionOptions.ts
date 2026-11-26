// #region Imports
import type { IRemoteEndpoint, IRemoteHostIdentity } from '@pixel-brewery/remote-protocol';
import type { IRemoteClientClock } from './IRemoteClientClock.js';
import type { IRemoteConnector } from '../../transport/interfaces/IRemoteConnector.js';
// #endregion

/**
 * Explicit environment and limits for one logical remote session.
 * @public
 */
export interface IRemoteSessionOptions {
    /**
     * Identity approved by QR or an existing safe profile.
     * @public
     */
    readonly identity: IRemoteHostIdentity;
    /**
     * One selected endpoint; there is no transparent cross-host failover.
     * @public
     */
    readonly endpoint: IRemoteEndpoint;
    /**
     * Connector whose ID must match the endpoint.
     * @public
     */
    readonly connector: IRemoteConnector;
    /**
     * Clock used for deterministic expiry and retry behavior.
     * @public
     */
    readonly clock: IRemoteClientClock;
    /**
     * Cryptographically strong operation identifier factory.
     * @public
     */
    readonly createId: () => string;
    /**
     * Maximum automatic restore attempts; defaults to eight.
     * @public
     */
    readonly retryLimit?: number;
    /**
     * Initial backoff in milliseconds; defaults to 500.
     * @public
     */
    readonly retryBaseMilliseconds?: number;
    /**
     * Maximum delay in milliseconds; defaults to 30000.
     * @public
     */
    readonly retryMaximumMilliseconds?: number;
    /**
     * Optional application error sink for observer failures; observer exceptions never roll back transport state.
     * Without a sink, failed observers are isolated. The sink itself must not throw.
     * @public
     */
    readonly onObserverError?: (error: unknown) => void;
}
