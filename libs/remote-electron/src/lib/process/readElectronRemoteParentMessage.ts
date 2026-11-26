// #region Imports
import type { IElectronRemoteControlMessage } from './interfaces/IElectronRemoteControlMessage.js';
import type { IElectronRemoteCredentialReplyMessage } from './interfaces/IElectronRemoteCredentialReplyMessage.js';
import type { IElectronRemoteInitializeMessage } from './interfaces/IElectronRemoteInitializeMessage.js';
import type { IElectronRemoteSignalMessage } from './interfaces/IElectronRemoteSignalMessage.js';
// #endregion

/**
 * Validate one untrusted message received by the Utility Process from Main.
 *
 * @remarks Internal protocol reader. Envelopes must carry exactly their documented keys. A control
 * request remains untrusted here: the Utility validates it with the canonical native request schema
 * and answers a malformed request with a correlated failure instead of dropping it.
 * @param raw - `data` of one parent-port message event.
 * @returns The validated message, or undefined for any unknown or malformed value.
 * @internal
 */
export function readElectronRemoteParentMessage(
    raw: unknown,
):
    | IElectronRemoteSignalMessage
    | IElectronRemoteInitializeMessage
    | IElectronRemoteControlMessage
    | IElectronRemoteCredentialReplyMessage
    | undefined {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
    const message = raw as Record<string, unknown>,
        keys = Object.keys(message);
    const only = (...allowed: string[]): boolean => keys.every((key) => allowed.includes(key));
    const kind = message['kind'],
        id = message['id'];
    if (kind === 'dispose' && only('kind')) return { kind };
    if (kind === 'initialize') {
        const { appId, assetsPath, storageDirectory, allowLoopbackForTests } = message;
        if (
            !only('kind', 'appId', 'assetsPath', 'storageDirectory', 'allowLoopbackForTests') ||
            typeof appId !== 'string' ||
            typeof assetsPath !== 'string' ||
            typeof storageDirectory !== 'string' ||
            typeof allowLoopbackForTests !== 'boolean' ||
            assetsPath.length > 4096 ||
            storageDirectory.length > 4096
        )
            return undefined;
        return { kind, appId, assetsPath, storageDirectory, allowLoopbackForTests };
    }
    if (typeof id !== 'string' || id.length < 1 || id.length > 64) return undefined;
    if (kind === 'control' && only('kind', 'id', 'request'))
        return { kind, id, request: message['request'] };
    if (kind !== 'credential.reply' || !only('kind', 'id', 'value', 'error')) return undefined;
    const value = message['value'],
        error = message['error'];
    if (error !== undefined)
        return error === true && value === undefined ? { kind, id, error } : undefined;
    if (value === undefined) return { kind, id };
    return value === null || typeof value === 'string' ? { kind, id, value } : undefined;
}
