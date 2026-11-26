# Interface: IBrowserRemotePairingScanner

Optional real native camera capability that reads one pairing invitation.

## Remarks

Supply it only when the platform actually provides a scanner, such as the Capacitor bridge.

## Methods

### scanPairing()

> **scanPairing**(): `Promise`\<`unknown`\>

Present the platform scanner and return the scanned invitation.

#### Returns

`Promise`\<`unknown`\>

Untrusted scanned value; the gate validates it as a canonical pairing bootstrap.

#### Throws

Error on user cancellation, permission denial or an unreadable code.
