# Class: JsonRemoteAccessStore

Atomic private-file persistence. The application selects the file and owns its data lifecycle.

## Implements

- `IRemoteAccessStore`

## Constructors

### Constructor

> **new JsonRemoteAccessStore**(`_path`): `JsonRemoteAccessStore`

Binds an application-owned path without creating or reading anything.

#### Parameters

##### \_path

`string`

Application-selected private record path with one active writer.

#### Returns

`JsonRemoteAccessStore`

## Methods

### load()

> **load**(): `Promise`\<`unknown`\>

Reads unknown storage for canonical validation by the access owner.

#### Returns

`Promise`\<`unknown`\>

Unknown persisted data, or null when no record exists.

#### Throws

A filesystem or JSON parse error for unreadable, malformed or symbolic-link storage.

#### Implementation of

`IRemoteAccessStore.load`

***

### save()

> **save**(`state`): `Promise`\<`void`\>

Writes and flushes a private temporary file before an atomic replacement.

#### Parameters

##### state

`IRemoteAccessState`

Complete canonical access record to replace atomically; a rejected write must preserve the preceding record.

#### Returns

`Promise`\<`void`\>

Resolves only after the replacement commits; rejects without changing the previous record.

#### Remarks

Temporary files use exclusive creation and mode 0600. The file is flushed before atomic rename. Use one writer per installation.

#### Throws

A validation or filesystem error when the new record cannot be committed.

#### Implementation of

`IRemoteAccessStore.save`
