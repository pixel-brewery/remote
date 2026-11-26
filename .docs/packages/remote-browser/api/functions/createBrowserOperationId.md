# Function: createBrowserOperationId()

> **createBrowserOperationId**(`cryptography`): `string`

Generate a UUID-shaped operation identifier in an HTTP LAN browser.

## Parameters

### cryptography

`Pick`\<`Crypto`, `"getRandomValues"`\>

Browser crypto port supporting getRandomValues in insecure contexts.

## Returns

`string`

Random version-four identifier without requiring crypto.randomUUID.
