# Interface: IRemoteApplicationAdapter

Product-owned request pipeline. Original streams reach the canonical product validators.

## Methods

### authorize()?

> `optional` **authorize**(`route`, `context`): `Promise`\<`void`\>

Optionally enforces product resource and state rules after device capability admission and before dispatch.

#### Parameters

##### route

`IRemoteRouteDefinition`

Registered operation being admitted.

##### context

`IRemoteRequestContext`

Authenticated device scope and owned cancellation signal.

#### Returns

`Promise`\<`void`\>

Resolves only when this device may perform the operation in the current product state.

#### Throws

An application error when the operation must be denied.

***

### handle()

> **handle**(`request`, `response`, `context`): `Promise`\<`void`\>

Runs the application-owned HTTP pipeline using the original request and response streams.

#### Parameters

##### request

`IncomingMessage`

Original IncomingMessage, retaining headers, multipart boundaries and incremental bytes.

##### response

`ServerResponse`

Original ServerResponse; preserve status, relevant headers and backpressure.

##### context

`IRemoteRequestContext`

Admitted device identity and signal aborted on disconnect or revocation.

#### Returns

`Promise`\<`void`\>

Resolves after dispatch is established or completed. Streaming owners must observe the context signal.

#### Throws

A product validation, authorization or dispatch error.

***

### webSocket()?

> `optional` **webSocket**(`socket`, `context`): `Promise`\<`void`\>

Optionally handles one registered, authenticated product event stream.

#### Parameters

##### socket

`WebSocket`

Open WebSocket owned by the host; validate every product message.

##### context

`IRemoteRequestContext`

Admitted operation and device scope; cancellation terminates device-owned work.

#### Returns

`Promise`\<`void`\>

Resolves after event handling is installed. The product must release its own subscriptions when the signal aborts.

#### Throws

An error when event setup fails; the host closes the socket.
