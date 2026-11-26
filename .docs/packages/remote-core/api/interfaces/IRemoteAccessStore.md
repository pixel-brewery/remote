# Interface: IRemoteAccessStore

One host-owned durable writer. A rejected save must leave the preceding record intact.

## Methods

### load()

> **load**(): `Promise`\<`unknown`\>

Reads the private record for canonical restoration validation; an absent record is returned as null.

#### Returns

`Promise`\<`unknown`\>

Unknown persisted data, or null when no record exists.

***

### save()

> **save**(`state`): `Promise`\<`void`\>

Atomically replaces the private access record after validation; rejected writes preserve the preceding record.

#### Parameters

##### state

`IRemoteAccessState`

Complete canonical access record to replace atomically; a rejected write must preserve the preceding record.

#### Returns

`Promise`\<`void`\>

Resolves only after the replacement commits; rejects without changing the previous record.
