# Class: FakeRemoteClock

Deterministic clock and scheduler shared by pairing and client-recovery tests.

## Implements

- `IRemoteClock`
- `IRemoteClientClock`

## Constructors

### Constructor

> **new FakeRemoteClock**(`now?`): `FakeRemoteClock`

Uses a stable UTC instant unless a test supplies another one.

#### Parameters

##### now?

`number` = `...`

Initial UTC epoch milliseconds; omission uses the deterministic 2026-01-01 test instant.

#### Returns

`FakeRemoteClock`

## Accessors

### pending

#### Get Signature

> **get** **pending**(): `number`

Number of callbacks waiting to run.

##### Returns

`number`

The number of callbacks still waiting in the deterministic scheduler.

## Methods

### advance()

> **advance**(`milliseconds`): `void`

Advances monotonically, running due callbacks with a guard against accidental infinite retry loops.

#### Parameters

##### milliseconds

`number`

Finite nonnegative duration by which to advance the fake clock.

#### Returns

`void`

***

### now()

> **now**(): `number`

Returns the current injected UTC instant.

#### Returns

`number`

The injected Unix time in milliseconds.

#### Implementation of

`IRemoteClock.now`

***

### schedule()

> **schedule**(`callback`, `delayMilliseconds`): () => `void`

Schedules a cancelable callback, ordering equal deadlines by registration.

#### Parameters

##### callback

() => `void`

Callback invoked at its scheduled deadline.

##### delayMilliseconds

`number`

Finite nonnegative delay relative to the injected clock.

#### Returns

An idempotent cancellation function for this scheduled callback.

() => `void`

#### Implementation of

`IRemoteClientClock.schedule`
