# Interface: IElectronSafeStorage

Structural Electron Main safeStorage port, never exposed through preload.

## Methods

### decryptString()

> **decryptString**(`value`): `string`

Decrypt within Electron Main only.

#### Parameters

##### value

`Buffer`

OS-encrypted bytes previously produced by this application's safeStorage instance.

#### Returns

`string`

Decrypted value for Main-process mediation only.

***

### encryptString()

> **encryptString**(`value`): `Buffer`

Encrypt within Electron Main using the OS store.

#### Parameters

##### value

`string`

Plaintext secret to encrypt inside Electron Main.

#### Returns

`Buffer`

OS-encrypted bytes safe to persist.

***

### getSelectedStorageBackend()?

> `optional` **getSelectedStorageBackend**(): `string`

Linux backends named basic_text are explicitly rejected.

#### Returns

`string`

Name of the selected backend; basic_text must be rejected.

***

### isEncryptionAvailable()

> **isEncryptionAvailable**(): `boolean`

Whether OS-backed encryption is actually available.

#### Returns

`boolean`

Whether OS-backed encryption is available.
