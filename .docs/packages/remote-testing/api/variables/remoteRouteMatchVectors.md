# Variable: remoteRouteMatchVectors

> `const` **remoteRouteMatchVectors**: readonly [`IRemoteRouteMatchVector`](../interfaces/IRemoteRouteMatchVector.md)[]

Serialized admission cases covering exact methods, complete parameters, canonical paths and ambiguity denial.

## Remarks

The owning runtime implementation is RemoteRouteRegistry. Native adapters must produce the same winners and denials.
