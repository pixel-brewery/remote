# Function: createRemoteApplicationHandler()

> **createRemoteApplicationHandler**(`dispatch`, `admit`): (`request`, `response`, `context`) => `Promise`\<`void`\>

Creates the `application.handle` implementation that hands SDK-admitted requests to an existing HTTP pipeline.

## Parameters

### dispatch

(`request`, `response`) => `void` \| `Promise`\<`void`\>

Existing application pipeline, for example a framework's Node request listener.

### admit

(`request`, `context`) => () => `void`

Provenance recorder such as [RemoteRequestAdmissions.admit](../classes/RemoteRequestAdmissions.md#admit); returns its release.

## Returns

A handler suitable for [IRemoteApplicationAdapter.handle](../interfaces/IRemoteApplicationAdapter.md#handle).

> (`request`, `response`, `context`): `Promise`\<`void`\>

Runs the application-owned HTTP pipeline using the original request and response streams.

### Parameters

#### request

`IncomingMessage`

Original IncomingMessage, retaining headers, multipart boundaries and incremental bytes.

#### response

`ServerResponse`

Original ServerResponse; preserve status, relevant headers and backpressure.

#### context

`IRemoteRequestContext`

Admitted device identity and signal aborted on disconnect or revocation.

### Returns

`Promise`\<`void`\>

Resolves after dispatch is established or completed. Streaming owners must observe the context signal.

### Throws

A product validation, authorization or dispatch error.

## Remarks

The host calls the handler only after device, route, capability and optional
product admission succeeded. The handler records the admission, then removes
the device transport headers `authorization`, `cookie` and `origin` from both
the parsed and raw header views, so the application never mistakes a device
credential for its own authentication and never re-evaluates the already
verified LAN origin. The original request and response streams are passed on
unchanged otherwise. The admission is released exactly once, on response
finish, response close or context abort. A synchronous dispatch error, or a
rejection of a returned promise, releases the admission and is rethrown to the
host, which then reports the failure. An already aborted context is refused
without admission or dispatch.

## Example

```ts
const admissions = new RemoteRequestAdmissions();
const application = {
    handle: createRemoteApplicationHandler(requestListener, (request, context) =>
        admissions.admit(request, context),
    ),
};
```
