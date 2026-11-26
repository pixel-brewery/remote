# Interface: IRemoteSessionOptions

Explicit environment and limits for one logical remote session.

## Properties

### clock

> `readonly` **clock**: [`IRemoteClientClock`](IRemoteClientClock.md)

Clock used for deterministic expiry and retry behavior.

***

### connector

> `readonly` **connector**: [`IRemoteConnector`](IRemoteConnector.md)

Connector whose ID must match the endpoint.

***

### createId

> `readonly` **createId**: () => `string`

Cryptographically strong operation identifier factory.

#### Returns

`string`

***

### endpoint

> `readonly` **endpoint**: `IRemoteEndpoint`

One selected endpoint; there is no transparent cross-host failover.

***

### identity

> `readonly` **identity**: `IRemoteHostIdentity`

Identity approved by QR or an existing safe profile.

***

### onObserverError?

> `readonly` `optional` **onObserverError?**: (`error`) => `void`

Optional application error sink for observer failures; observer exceptions never roll back transport state.
Without a sink, failed observers are isolated. The sink itself must not throw.

#### Parameters

##### error

`unknown`

#### Returns

`void`

***

### retryBaseMilliseconds?

> `readonly` `optional` **retryBaseMilliseconds?**: `number`

Initial backoff in milliseconds; defaults to 500.

***

### retryLimit?

> `readonly` `optional` **retryLimit?**: `number`

Maximum automatic restore attempts; defaults to eight.

***

### retryMaximumMilliseconds?

> `readonly` `optional` **retryMaximumMilliseconds?**: `number`

Maximum delay in milliseconds; defaults to 30000.
