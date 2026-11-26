# Function: createRemotePairingUrl()

> **createRemotePairingUrl**(`input`): `string`

Encodes one invitation in a browser fragment so its challenge is excluded from HTTP requests and referrers.

## Parameters

### input

[`IRemotePairingBootstrap`](../type-aliases/IRemotePairingBootstrap.md)

Canonical short-lived invitation created by the selected host.

## Returns

`string`

The app-root pairing URL for QR rendering or conscious out-of-band copying.

## Throws

A schema validation error for an invalid invitation.

## Remarks

Treat the returned URL as a secret until the challenge expires. Do not log it or store it as a saved connection.
