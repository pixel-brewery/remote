# Class: BrowserPairingLocation

Reads pairing material from a fragment, which the browser never sends in the HTTP request.

## Remarks

Clear only after a durable pairing outcome; retaining a pending attempt permits safe recovery.

## Constructors

### Constructor

> **new BrowserPairingLocation**(`_location`, `_history`): `BrowserPairingLocation`

Supply the owning document and history explicitly.

#### Parameters

##### \_location

`Pick`\<`Location`, `"origin"` \| `"pathname"` \| `"search"` \| `"hash"`\>

Current document origin, pathname, search and fragment.

##### \_history

`Pick`\<`History`, `"replaceState"`\>

History replacement port used after durable pairing.

#### Returns

`BrowserPairingLocation`

## Methods

### clear()

> **clear**(): `void`

Remove short-lived invitation material without navigating or changing its query.

#### Returns

`void`

***

### read()

> **read**(): `Readonly`\<\{ `appId`: `string`; `challenge`: `string`; `expiresAt`: `string`; `hostId`: `string`; `origin`: `string`; \}\> \| `null`

Decode and validate one complete invitation fragment.

#### Returns

`Readonly`\<\{ `appId`: `string`; `challenge`: `string`; `expiresAt`: `string`; `hostId`: `string`; `origin`: `string`; \}\> \| `null`

Invitation, or null when no pairing fragment is present.

#### Throws

Error for duplicate, missing or malformed pairing fields.
