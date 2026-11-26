// #region Imports
import type { IRemoteAccessState } from '@pixel-brewery/remote-protocol';
// #endregion
/**
 * One host-owned durable writer. A rejected save must leave the preceding record intact.
 *
 * @public
 */
export interface IRemoteAccessStore {
    /**
     * Reads the private record for canonical restoration validation; an absent record is returned as null.
     *
     * @returns Unknown persisted data, or null when no record exists.
     *
     * @public
     */
    load(): Promise<unknown>;
    /**
     * Atomically replaces the private access record after validation; rejected writes preserve the preceding record.
     *
     * @param state - Complete canonical access record to replace atomically; a rejected write must preserve the preceding record.
     * @returns Resolves only after the replacement commits; rejects without changing the previous record.
     *
     * @public
     */
    save(state: IRemoteAccessState): Promise<void>;
}
