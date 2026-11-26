# Interface: IRemoteAccessStatus

Safe host-administration projection. No credential or token hash is included.

## Properties

### devices

> `readonly` **devices**: readonly `object`[]

Paired device metadata with credential hashes omitted from public administration projections.

***

### enabled

> `readonly` **enabled**: `boolean`

Persisted activation intent. A transport may be unavailable while this value remains true.

***

### pendingPairings

> `readonly` **pendingPairings**: readonly `object`[]

Consumed invitations still awaiting a successful device grant, without challenges or credentials. Host approval applies only when configured.
