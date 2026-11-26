# Interface: IRemoteTlsProvider

Applications own issuance, renewal and protected storage. The SDK only consumes supplied material.

## Methods

### getMaterial()

> **getMaterial**(): `Promise`\<[`IRemoteTlsMaterial`](IRemoteTlsMaterial.md)\>

Loads the current app-owned certificate, key and optional chain for the TLS listener.

#### Returns

`Promise`\<[`IRemoteTlsMaterial`](IRemoteTlsMaterial.md)\>

The current material supplied and protected by the application.

***

### subscribe()?

> `optional` **subscribe**(`listener`): () => `void`

Optionally observes renewal of application-owned TLS identity material.

#### Parameters

##### listener

() => `void`

Called after new material is available; the adapter reloads it through getMaterial.

#### Returns

An idempotent cleanup removing this renewal registration. No initial callback is required.

() => `void`
