# Interface: IRemoteClientClock

Clock and scheduler supplied by the host environment.

## Methods

### now()

> **now**(): `number`

Return the current Unix time in milliseconds.

#### Returns

`number`

Current Unix timestamp in milliseconds.

***

### schedule()

> **schedule**(`callback`, `delayMilliseconds`): () => `void`

Schedule one callback and return its cancellation function.

#### Parameters

##### callback

() => `void`

One callback invoked when the scheduler delay elapses.

##### delayMilliseconds

`number`

Nonnegative delay before the callback may run.

#### Returns

Idempotent cancellation function for the scheduled callback.

() => `void`
