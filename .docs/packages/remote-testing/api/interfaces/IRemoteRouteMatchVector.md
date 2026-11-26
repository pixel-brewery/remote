# Interface: IRemoteRouteMatchVector

One canonical route-admission example reusable by TypeScript and generated native tests.

## Properties

### method

> `readonly` **method**: `string`

Exact caller HTTP method to admit.

***

### name

> `readonly` **name**: `string`

Human-readable invariant exercised by the vector.

***

### operationId

> `readonly` **operationId**: `string` \| `null`

Winning operation identifier, or null when admission must fail closed.

***

### path

> `readonly` **path**: `string`

Original origin-form target, including its optional query.

***

### routes

> `readonly` **routes**: readonly `IRemoteRouteDefinition`[]

Immutable operation registrations for this case.
