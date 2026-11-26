# Function: createBrowserClock()

> **createBrowserClock**(`environment`): `IRemoteClientClock`

Adapt supplied browser timing APIs without reading globals during module import.

## Parameters

### environment

`Pick`\<`Window`, `"setTimeout"` \| `"clearTimeout"`\>

Browser timer functions belonging to the owning window.

## Returns

`IRemoteClientClock`

Clock with cancellation for every scheduled callback.
