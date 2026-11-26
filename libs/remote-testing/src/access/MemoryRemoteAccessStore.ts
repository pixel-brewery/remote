// #region Imports
import type { IRemoteAccessStore } from '@pixel-brewery/remote-core';
import { remoteAccessStateSchema, type IRemoteAccessState } from '@pixel-brewery/remote-protocol';
// #endregion
/**
 * Isolated atomic store for access-core and adapter tests; rejected saves preserve the previous record.
 *
 * @public
 */
export class MemoryRemoteAccessStore implements IRemoteAccessStore {
    // #region Fields
    private _value: unknown;
    private _failure: Error | undefined;
    private _writes = 0;
    // #endregion
    // #region Ctor
    /**
     * Seeds a fresh store, including intentionally invalid restoration inputs.
     *
     * @param value - Initial detached record, including deliberately malformed restoration data for negative tests.
     * @public
     */
    public constructor(value: unknown = null) {
        this._value = structuredClone(value);
    }
    // #endregion
    // #region Properties
    /**
     * Number of successfully committed writes.
     *
     * @returns The number of saves committed since construction.
     * @public
     */
    public get writes(): number {
        return this._writes;
    }
    // #endregion
    // #region Methods
    /**
     * Returns a detached record so tests cannot mutate persisted authority accidentally.
     *
     * @returns Unknown persisted data, or null when no record exists.
     * @public
     */
    public async load(): Promise<unknown> {
        return structuredClone(this._value);
    }
    /**
     * Atomically commits a canonical state or reports the configured injected failure.
     *
     * @param state - Complete canonical access record to replace atomically; a rejected write must preserve the preceding record.
     * @returns Resolves only after the replacement commits; rejects without changing the previous record.
     * @public
     */
    public async save(state: IRemoteAccessState): Promise<void> {
        if (this._failure) {
            const failure = this._failure;
            this._failure = undefined;
            throw failure;
        }
        this._value = structuredClone(remoteAccessStateSchema.parse(state));
        this._writes++;
    }
    /**
     * Makes exactly the next save fail before replacing any durable record.
     *
     * @param error - Failure to inject before exactly the next store commit.
     * @public
     */
    public failNextSave(error = new Error('Injected storage failure.')): void {
        this._failure = error;
    }
    // #endregion
}
