# Function: readRemoteJson()

> **readRemoteJson**(`response`, `maximumBytes?`): `Promise`\<`unknown`\>

Read one bounded JSON product response obtained through an authorized remote session.

## Parameters

### response

`IRemoteByteResponse`

Remote byte response whose body this function takes ownership of.

### maximumBytes?

`number` = `65_536`

Positive inclusive byte bound for the JSON document; defaults to 65536.

## Returns

`Promise`\<`unknown`\>

The parsed JSON value before application schema validation.

## Remarks

Intended for small metadata reads such as an application's capability declaration. The response is
always consumed or cancelled, also after a failure. The result is untrusted until the application validates it.

## Example

```ts
const response = await session.request({ method: 'GET', path: '/api/capabilities', signal });
const metadata = capabilitiesSchema.parse(await readRemoteJson(response));
```

## Throws

RangeError for an invalid bound or an oversized document.

## Throws

Error for a non-2xx status; TypeError or SyntaxError for invalid UTF-8 or JSON.
