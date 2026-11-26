# Interface: IRemoteHostStatus

Safe network and device administration state.

## Properties

### access

> `readonly` **access**: `IRemoteAccessStatus`

Sanitized authorization state with neither token hashes nor plaintext credentials.

***

### errorCode?

> `readonly` `optional` **errorCode?**: `string`

Optional safe diagnostic code for the current unavailable state.

***

### host

> `readonly` **host**: `IRemoteHostDescriptor`

Public identity and currently advertised listener endpoints of this owned host.

***

### state

> `readonly` **state**: `"disabled"` \| `"disposed"` \| `"available"` \| `"rebinding"` \| `"starting"` \| `"stopping"` \| `"unavailable"`

Current listener lifecycle state. Unavailable does not erase the persisted activation preference.
