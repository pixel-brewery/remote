# Interface: IRemoteServerEvent

Bounded SSE event; products own interpretation and payload validation.

## Properties

### data

> `readonly` **data**: `string`

Joined data lines without implicit JSON parsing.

***

### id?

> `readonly` `optional` **id?**: `string`

Optional server event ID; replay is not assumed.

***

### type

> `readonly` **type**: `string`

Event type, or message when no explicit name is present.
