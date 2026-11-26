# Function: selectPrivateHost()

> **selectPrivateHost**(): `string`

Selects one private physical IPv4 interface deterministically, preferring Wi-Fi/Ethernet.

## Returns

`string`

One numeric private IPv4 address from a supported physical interface.

## Throws

RemoteProtocolError when no supported private interface is available.
