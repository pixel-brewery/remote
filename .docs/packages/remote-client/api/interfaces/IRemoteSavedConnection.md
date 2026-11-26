# Interface: IRemoteSavedConnection

Safe local profile metadata. It never contains pairing or session credentials.

## Properties

### endpoints

> `readonly` **endpoints**: readonly `Readonly`\<\{ `id`: `string`; `origin`: `string`; `transportId`: `string`; \}\>[]

Explicitly selected endpoints for this host.

***

### id

> `readonly` **id**: `string`

Application-generated profile identifier.

***

### identity

> `readonly` **identity**: `IRemoteHostIdentity`

Verified product and installation identity.

***

### label

> `readonly` **label**: `string`

Human-readable local label.

***

### selectedEndpointId

> `readonly` **selectedEndpointId**: `string`

Endpoint selected for the next connection.
