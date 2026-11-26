# Interface: IRemoteTlsMaterial

Application-supplied server identity, confined to the privileged Node runtime.

## Properties

### ca?

> `readonly` `optional` **ca?**: `string` \| `Buffer`\<`ArrayBufferLike`\> \| readonly (`string` \| `Buffer`\<`ArrayBufferLike`\>)[]

Optional PEM issuer chain consumed by the TLS implementation.

***

### cert

> `readonly` **cert**: `string` \| `Buffer`\<`ArrayBufferLike`\>

Application-supplied PEM certificate or certificate chain.

***

### key

> `readonly` **key**: `string` \| `Buffer`\<`ArrayBufferLike`\>

Application-supplied private server key. Keep this value confined to the privileged runtime.

***

### passphrase?

> `readonly` `optional` **passphrase?**: `string`

Optional private-key decryption passphrase supplied by the application.
