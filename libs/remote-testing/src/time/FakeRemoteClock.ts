// #region Imports
import type { IRemoteClock } from '@pixel-brewery/remote-core';
import type { IRemoteClientClock } from '@pixel-brewery/remote-client';
import type { IRemoteScheduledCallback } from './interfaces/IRemoteScheduledCallback.js';
// #endregion
/**
 * Deterministic clock and scheduler shared by pairing and client-recovery tests.
 *
 * @public
 */
export class FakeRemoteClock implements IRemoteClock, IRemoteClientClock {
    // #region Fields
    private _now: number;
    private _sequence = 0;
    private readonly _tasks = new Map<number, IRemoteScheduledCallback>();
    // #endregion
    // #region Ctor
    /**
     * Uses a stable UTC instant unless a test supplies another one.
     *
     * @param now - Initial UTC epoch milliseconds; omission uses the deterministic 2026-01-01 test instant.
     * @public
     */
    public constructor(now = Date.UTC(2026, 0, 1)) {
        if (!Number.isFinite(now)) throw new RangeError('The fake instant must be finite.');
        this._now = now;
    }
    // #endregion
    // #region Properties
    /**
     * Number of callbacks waiting to run.
     *
     * @returns The number of callbacks still waiting in the deterministic scheduler.
     * @public
     */
    public get pending(): number {
        return this._tasks.size;
    }
    // #endregion
    // #region Methods
    /**
     * Returns the current injected UTC instant.
     *
     * @returns The injected Unix time in milliseconds.
     * @public
     */
    public now(): number {
        return this._now;
    }
    /**
     * Schedules a cancelable callback, ordering equal deadlines by registration.
     *
     * @param callback - Callback invoked at its scheduled deadline.
     * @param delayMilliseconds - Finite nonnegative delay relative to the injected clock.
     * @returns An idempotent cancellation function for this scheduled callback.
     * @public
     */
    public schedule(callback: () => void, delayMilliseconds: number): () => void {
        if (!Number.isFinite(delayMilliseconds) || delayMilliseconds < 0)
            throw new RangeError('The delay must be nonnegative and finite.');
        const id = ++this._sequence;
        this._tasks.set(id, { at: this._now + delayMilliseconds, callback });
        return () => {
            this._tasks.delete(id);
        };
    }
    /**
     * Advances monotonically, running due callbacks with a guard against accidental infinite retry loops.
     *
     * @param milliseconds - Finite nonnegative duration by which to advance the fake clock.
     * @public
     */
    public advance(milliseconds: number): void {
        if (!Number.isFinite(milliseconds) || milliseconds < 0)
            throw new RangeError('The advance must be nonnegative and finite.');
        const until = this._now + milliseconds;
        let runs = 0;
        while (true) {
            const next = [...this._tasks.entries()]
                .filter(([, task]) => task.at <= until)
                .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
            if (!next) break;
            if (++runs > 10000) throw new Error('The fake scheduler exceeded its callback budget.');
            this._tasks.delete(next[0]);
            this._now = next[1].at;
            next[1].callback();
        }
        this._now = until;
    }
    // #endregion
}
