# Class: RemoteRouteRegistry

Immutable, deny-by-default product route admission shared by hosts and client gateways.

## Constructors

### Constructor

> **new RemoteRouteRegistry**(`routes`): `RemoteRouteRegistry`

Registers exact methods and paths; colon-prefixed complete segments match one parameter.

#### Parameters

##### routes

readonly `IRemoteRouteDefinition`[]

Explicit exact-method registrations. Parameter segments begin with a colon and match one nonempty path segment.

#### Returns

`RemoteRouteRegistry`

#### Throws

RemoteProtocolError for reserved routes, duplicate patterns or safe-read policy on a mutation.

## Methods

### authorize()

> **authorize**(`method`, `path`, `principal`): `IRemoteRouteDefinition`

Resolves and checks every required capability at the actual request boundary.

#### Parameters

##### method

`string`

Exact registered HTTP method to resolve.

##### path

`string`

Origin-form request target whose path is admitted by the route registry; queries are preserved by transports.

##### principal

`IRemotePrincipal`

Authenticated app, installation, device and capability scope to enforce.

#### Returns

`IRemoteRouteDefinition`

The admitted route whose complete required capability set is present on the device principal.

#### Throws

RemoteProtocolError when any required capability is absent.

***

### match()

> **match**(`method`, `input`): `IRemoteRouteDefinition`

Resolves one route without granting any device authority.

#### Parameters

##### method

`string`

Exact registered HTTP method to resolve.

##### input

`string`

Untrusted input validated by the canonical contract before use.

#### Returns

`IRemoteRouteDefinition`

The single most specific registered operation, without granting authorization.

#### Throws

RemoteProtocolError when no unique operation is registered or the path is malformed.
