# Class: MemoryRemoteAccessStore

Isolated atomic store for access-core and adapter tests; rejected saves preserve the previous record.

## Implements

- `IRemoteAccessStore`

## Constructors

### Constructor

> **new MemoryRemoteAccessStore**(`value?`): `MemoryRemoteAccessStore`

Seeds a fresh store, including intentionally invalid restoration inputs.

#### Parameters

##### value?

`unknown` = `null`

Initial detached record, including deliberately malformed restoration data for negative tests.

#### Returns

`MemoryRemoteAccessStore`

## Accessors

### writes

#### Get Signature

> **get** **writes**(): `number`

Number of successfully committed writes.

##### Returns

`number`

The number of saves committed since construction.

## Methods

### failNextSave()

> **failNextSave**(`error?`): `void`

Makes exactly the next save fail before replacing any durable record.

#### Parameters

##### error?

`Error` = `...`

Failure to inject before exactly the next store commit.

#### Returns

`void`

***

### load()

> **load**(): `Promise`\<`unknown`\>

Returns a detached record so tests cannot mutate persisted authority accidentally.

#### Returns

`Promise`\<`unknown`\>

Unknown persisted data, or null when no record exists.

#### Implementation of

`IRemoteAccessStore.load`

***

### save()

> **save**(`state`): `Promise`\<`void`\>

Atomically commits a canonical state or reports the configured injected failure.

#### Parameters

##### state

`IRemoteAccessState`

Complete canonical access record to replace atomically; a rejected write must preserve the preceding record.

#### Returns

`Promise`\<`void`\>

Resolves only after the replacement commits; rejects without changing the previous record.

#### Implementation of

`IRemoteAccessStore.save`
