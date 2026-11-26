# Interface: IBrowserRemoteWindow

Minimal structural view of the document window used by the pre-framework remote gate.

## Remarks

A real `Window` satisfies this contract. Tests and embedding applications may supply an equivalent
object. The gate reads these ports only after construction, during preparation, commands and attachment.

## Properties

### addEventListener

> `readonly` **addEventListener**: \{\<`K`\>(`type`, `listener`, `options?`): `void`; (`type`, `listener`, `options?`): `void`; \}

Event registration used by attachment for `hashchange`, `pagehide` and `pageshow`.

#### Call Signature

> \<`K`\>(`type`, `listener`, `options?`): `void`

The **`addEventListener()`** method of the EventTarget interface sets up a function that will be called whenever the specified event is delivered to the target.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/addEventListener)

##### Type Parameters

###### K

`K` *extends* keyof `WindowEventMap`

##### Parameters

###### type

`K`

###### listener

(`this`, `ev`) => `any`

###### options?

`boolean` \| `AddEventListenerOptions`

##### Returns

`void`

#### Call Signature

> (`type`, `listener`, `options?`): `void`

The **`addEventListener()`** method of the EventTarget interface sets up a function that will be called whenever the specified event is delivered to the target.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/addEventListener)

##### Parameters

###### type

`string`

###### listener

`EventListenerOrEventListenerObject`

###### options?

`boolean` \| `AddEventListenerOptions`

##### Returns

`void`

***

### clearTimeout

> `readonly` **clearTimeout**: (`id`) => `void`

Timer cancellation bound to this window.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/clearTimeout)

#### Parameters

##### id

`number` \| `undefined`

#### Returns

`void`

***

### crypto

> `readonly` **crypto**: `Pick`\<`Crypto`, `"getRandomValues"`\>

Random source for HTTP-safe operation identifiers; secure-context-only APIs are not required.

***

### fetch

> `readonly` **fetch**: (`input`, `init?`) => `Promise`\<`Response`\>

Same-origin browser fetch, invoked as a method of this window.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

#### Parameters

##### input

`RequestInfo` \| `URL`

##### init?

`RequestInit`

#### Returns

`Promise`\<`Response`\>

***

### history

> `readonly` **history**: `Pick`\<`History`, `"replaceState"`\>

History replacement port used to remove a consumed invitation fragment without navigating.

***

### location

> `readonly` **location**: `Pick`\<`Location`, `"origin"` \| `"protocol"` \| `"hostname"` \| `"port"` \| `"pathname"` \| `"search"` \| `"hash"` \| `"assign"` \| `"reload"`\>

Current document address. The gate reads its origin and fragment, assigns explicit invitation or local-view
addresses and reloads a page restored from the back-forward cache after disposal.

***

### navigator

> `readonly` **navigator**: `Pick`\<`Navigator`, `"platform"`\>

Navigator platform used for the default browser device label.

***

### removeEventListener

> `readonly` **removeEventListener**: \{\<`K`\>(`type`, `listener`, `options?`): `void`; (`type`, `listener`, `options?`): `void`; \}

Event removal used by the detach function returned from attachment.

#### Call Signature

> \<`K`\>(`type`, `listener`, `options?`): `void`

The **`removeEventListener()`** method of the EventTarget interface removes an event listener previously registered with EventTarget.addEventListener() from the target. The event listener to be removed is identified using a combination of the event type, the event listener function itself, and various optional options that may affect the matching process; see Matching event listeners for removal.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/removeEventListener)

##### Type Parameters

###### K

`K` *extends* keyof `WindowEventMap`

##### Parameters

###### type

`K`

###### listener

(`this`, `ev`) => `any`

###### options?

`boolean` \| `EventListenerOptions`

##### Returns

`void`

#### Call Signature

> (`type`, `listener`, `options?`): `void`

The **`removeEventListener()`** method of the EventTarget interface removes an event listener previously registered with EventTarget.addEventListener() from the target. The event listener to be removed is identified using a combination of the event type, the event listener function itself, and various optional options that may affect the matching process; see Matching event listeners for removal.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/removeEventListener)

##### Parameters

###### type

`string`

###### listener

`EventListenerOrEventListenerObject`

###### options?

`boolean` \| `EventListenerOptions`

##### Returns

`void`

***

### sessionStorage

> `readonly` **sessionStorage**: `Pick`\<`Storage`, `"getItem"` \| `"setItem"` \| `"removeItem"`\>

Optional public pairing-attempt cache. Access may throw when storage is blocked; the gate then keeps its
attempt in memory only.

***

### setTimeout

> `readonly` **setTimeout**: (`handler`, `timeout?`, ...`arguments`) => `number`

Timer scheduling bound to this window, used for the preparation deadline and session retry clock.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/setTimeout)

#### Parameters

##### handler

`TimerHandler`

##### timeout?

`number`

##### arguments

...`any`[]

#### Returns

`number`
