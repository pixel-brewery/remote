// #region Imports
import { RemoteProtocolError } from '@pixel-brewery/remote-protocol';
import type { RemoteHostControlCommand } from './models/RemoteHostControlCommand.js';
// #endregion

/**
 * Validates the complete JSON body of one private host-control command.
 *
 * @remarks
 * `/enable`, `/disable` and `/reconcile` accept exactly `{}`; `/pair` accepts
 * `{}` or `{ "endpointId": string }`; `/revoke` requires exactly
 * `{ "deviceId": string }`. Unknown fields, arrays, other paths and malformed
 * identifiers fail. The caller must establish local authority before parsing.
 * Parsing starts no listener, saves no state and creates no invitation.
 *
 * @param path - Exact command path below the control prefix, such as `/enable`.
 * @param body - Parsed JSON value of the bounded request body.
 * @returns One known command containing only explicitly selected fields.
 * @throws RemoteProtocolError with `invalid-request` for an unsupported path, shape or identifier.
 *
 * @public
 */
export function parseRemoteHostControlCommand(
    path: string,
    body: unknown,
): RemoteHostControlCommand {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) return invalid();
    const value = body as Readonly<Record<string, unknown>>;
    const keys = Object.keys(value);
    if (path === '/enable' && keys.length === 0) return { kind: 'enable' };
    if (path === '/disable' && keys.length === 0) return { kind: 'disable' };
    if (path === '/reconcile' && keys.length === 0) return { kind: 'reconcile' };
    const endpointId = value['endpointId'];
    if (
        path === '/pair' &&
        keys.every((key) => key === 'endpointId') &&
        (endpointId === undefined ||
            (typeof endpointId === 'string' && /^[A-Za-z0-9._:-]{1,160}$/u.test(endpointId)))
    )
        return { kind: 'pair', ...(typeof endpointId === 'string' ? { endpointId } : {}) };
    const deviceId = value['deviceId'];
    if (
        path === '/revoke' &&
        keys.length === 1 &&
        keys[0] === 'deviceId' &&
        typeof deviceId === 'string' &&
        /^[A-Za-z0-9_-]{1,160}$/u.test(deviceId)
    )
        return { kind: 'revoke', deviceId };
    return invalid();
}

/**
 * Rejects a control shape without echoing submitted values.
 *
 * @throws RemoteProtocolError with the fixed `invalid-request` diagnostic.
 *
 * @internal
 */
function invalid(): never {
    throw new RemoteProtocolError(
        'invalid-request',
        'The private remote-control request is invalid.',
    );
}
