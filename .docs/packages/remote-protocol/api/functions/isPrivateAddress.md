# Function: isPrivateAddress()

> **isPrivateAddress**(`address`): `boolean`

Tests supported numeric private LAN addresses. Loopback requires a separate allowance.

## Parameters

### address

`string`

Numeric IPv4 or unscoped IPv6, optionally enclosed in matching brackets.

## Returns

`boolean`

Whether a syntactically complete address belongs to RFC1918 or IPv6 unique-local space.
