# Interface: IRemoteLocalGatewayView

Privileged bootstrap result. Native code installs the cookie; only origin/identity reach its view.

## Properties

### connectionId

> `readonly` **connectionId**: `string`

Application-owned saved-connection identifier identifying this local view.

***

### cookie

> `readonly` **cookie**: `object`

Ephemeral local-view credential installed by native code; omit this object from renderer projections.

#### httpOnly

> `readonly` **httpOnly**: `true`

Always true so view JavaScript cannot read the local capability.

#### name

> `readonly` **name**: `string`

Opaque per-view cookie name. Native code installs it only at the returned loopback origin.

#### path

> `readonly` **path**: `"/"`

Always the local origin root so assets and registered content requests share the same ephemeral local session.

#### sameSite

> `readonly` **sameSite**: `"strict"`

Always strict; cross-site requests do not carry this local capability.

#### secure

> `readonly` **secure**: `false`

False because this capability is confined to an explicit HTTP loopback origin.

#### value

> `readonly` **value**: `string`

Ephemeral local-view cookie secret. This value is distinct from the durable remote device credential.

***

### identity

> `readonly` **identity**: `IRemoteHostIdentity`

Selected app and installation to which the privileged upstream transport belongs.

***

### origin

> `readonly` **origin**: `string`

HTTP(S) origin without credentials, path, query or fragment.
