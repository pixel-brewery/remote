# Class: JsonRemoteProfileStore

Private JSON file of credential-free saved connection profiles for one application namespace.

## Remarks

Use one instance per profile file inside the network-owning Utility Process. Writes are
validated before they are queued, serialized in caller order, flushed and then atomically renamed
over the previous file, so a failed replacement leaves the last committed file readable. Reads wait
for queued writes and return only committed metadata. No handle stays open between calls. The
canonical strict profile schema rejects credential or other additional fields; device credentials
belong exclusively to the Main-owned OS vault.

## Implements

- `IRemoteProfileStore`

## Constructors

### Constructor

> **new JsonRemoteProfileStore**(`_path`, `_appId`): `JsonRemoteProfileStore`

Select the private profile file and the only application namespace it may contain.

#### Parameters

##### \_path

`string`

Absolute application-owned file path. Its directory is created with mode 0700 on first save.

##### \_appId

`string`

Canonical lowercase application namespace every stored profile must belong to.

#### Returns

`JsonRemoteProfileStore`

#### Throws

Error when the path is relative or the namespace is not a canonical application identifier.

## Methods

### load()

> **load**(): `Promise`\<readonly `IRemoteSavedConnection`[]\>

Load the committed profiles of this application namespace.

#### Returns

`Promise`\<readonly `IRemoteSavedConnection`[]\>

Validated safe profiles, or an empty collection when the file does not exist yet.

#### Throws

Error when the file is not a bounded regular file, is malformed, holds more than 64
profiles, repeats an identifier or contains another application's profile.

#### Implementation of

`IRemoteProfileStore.load`

***

### save()

> **save**(`profiles`): `Promise`\<`void`\>

Durably replace the complete profile collection.

#### Parameters

##### profiles

readonly `IRemoteSavedConnection`[]

Complete credential-free snapshot. It is validated and copied before queuing,
so later caller mutations do not reach the file.

#### Returns

`Promise`\<`void`\>

Completion after the flushed private file has atomically replaced its predecessor.

#### Throws

Error synchronously for invalid, duplicate, foreign or credential-bearing metadata, and
through the returned promise when the directory is unsafe or persistence fails.

#### Implementation of

`IRemoteProfileStore.save`
