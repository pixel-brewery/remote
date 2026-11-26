# Class: RemoteRequestAdmissions

Records non-forgeable provenance of requests admitted by the remote host, inside one process.

## Remarks

No header, cookie or request property grants this provenance: only the exact
request object passed to [RemoteRequestAdmissions.admit](#admit) is recognized,
so application gates can distinguish SDK-admitted device requests from local
callers. An admission is live until its release runs or its context signal
aborts. Entries are held weakly and never extend a request's lifetime.

## Constructors

### Constructor

> **new RemoteRequestAdmissions**(): `RemoteRequestAdmissions`

#### Returns

`RemoteRequestAdmissions`

## Methods

### admit()

> **admit**(`request`, `context`): () => `void`

Admits one SDK-authorized request until its response or owned work ends.

#### Parameters

##### request

`object`

Original request object passed on to the application pipeline.

##### context

`IRemoteRequestContext`

Authenticated device, registered operation and cancellation scope.

#### Returns

Idempotent release removing only this admission; a later admission of the same
request survives the release of an earlier one.

() => `void`

***

### context()

> **context**(`request`): `IRemoteRequestContext` \| `undefined`

Reads the device context of a live admission.

#### Parameters

##### request

`object`

Request currently entering an application gate.

#### Returns

`IRemoteRequestContext` \| `undefined`

The admitted context, or undefined when the request was never admitted, was released
or its signal aborted.

***

### has()

> **has**(`request`): `boolean`

Tests provenance without trusting any caller-supplied header or property.

#### Parameters

##### request

`object`

Request currently entering an application gate.

#### Returns

`boolean`

True only for a live, unreleased and unaborted admission of this exact object.
