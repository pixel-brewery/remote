// #region Imports
import { remoteHostIdentitySchema } from '@pixel-brewery/remote-protocol';
import type { IElectronRemoteCredentialMessage } from './interfaces/IElectronRemoteCredentialMessage.js';
import type { IElectronRemoteReplyMessage } from './interfaces/IElectronRemoteReplyMessage.js';
import type { IElectronRemoteSignalMessage } from './interfaces/IElectronRemoteSignalMessage.js';
// #endregion

const signals = new Set(['ready', 'initialized', 'initialization.failed', 'disposed']);
const operations = new Set(['get', 'set', 'delete']);

/**
 * Validate one untrusted message received by Main from its Utility Process.
 *
 * @remarks Internal protocol reader. Envelopes must carry exactly their documented keys; credential
 * identities pass the canonical host identity schema. A reply value remains untrusted and is
 * validated by Main for the request kind it sent.
 * @param raw - Structured-clone value emitted by the Utility Process.
 * @returns The validated message, or undefined for any unknown or malformed value.
 * @internal
 */
export function readElectronRemoteChildMessage(
    raw: unknown,
):
    | IElectronRemoteSignalMessage
    | IElectronRemoteReplyMessage
    | IElectronRemoteCredentialMessage
    | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const message = raw as Record<string, unknown>,
        keys = Object.keys(message);
    const only = (...allowed: string[]): boolean => keys.every((key) => allowed.includes(key));
    const kind = message['kind'],
        id = message['id'];
    if (typeof kind === 'string' && signals.has(kind) && only('kind'))
        return { kind: kind as IElectronRemoteSignalMessage['kind'] };
    if (typeof id !== 'string' || id.length < 1 || id.length > 64) return undefined;
    if (kind === 'reply' && only('kind', 'id', 'value', 'error')) {
        const error = message['error'];
        if (error === undefined) return { kind, id, value: message['value'] };
        if (typeof error !== 'string' || error.length > 512 || 'value' in message) return undefined;
        return { kind, id, error };
    }
    if (kind !== 'credential' || !only('kind', 'id', 'operation', 'identity', 'credential'))
        return undefined;
    const operation = message['operation'],
        credential = message['credential'],
        identity = remoteHostIdentitySchema.safeParse(message['identity']);
    if (typeof operation !== 'string' || !operations.has(operation) || !identity.success)
        return undefined;
    if (operation !== 'set')
        return credential === undefined
            ? { kind, id, operation: operation as 'get' | 'delete', identity: identity.data }
            : undefined;
    if (typeof credential !== 'string' || credential.length < 32 || credential.length > 256)
        return undefined;
    return { kind, id, operation, identity: identity.data, credential };
}
