// #region Imports
import { isIP } from 'node:net';
import {
    isPrivateAddress,
    remoteEndpointSchema,
    RemoteProtocolError,
    type IRemoteEndpoint,
} from '@pixel-brewery/remote-protocol';
import type { INodeRemoteConnectorOptions } from './interfaces/INodeRemoteConnectorOptions.js';
// #endregion

/**
 * Applies the same selected-peer policy at connector and directly constructed transport boundaries.
 *
 * @param input - Endpoint received from a saved profile or pairing invitation.
 * @param options - Application-owned transport selection and explicit test-loopback exception.
 * @returns A canonical immutable numeric private endpoint.
 * @throws RemoteProtocolError when the origin, protocol, address or connector is disallowed.
 * @internal
 */
export function validatePrivateRemoteEndpoint(
    input: IRemoteEndpoint,
    options: INodeRemoteConnectorOptions,
): IRemoteEndpoint {
    const parsed = remoteEndpointSchema.safeParse(input);
    if (!parsed.success)
        throw new RemoteProtocolError('invalid-request', 'The remote endpoint is invalid.');
    const endpoint = parsed.data;
    const url = new URL(endpoint.origin);
    const host = url.hostname.replace(/^\[|\]$/gu, '');
    const loopback = host === '127.0.0.1' || host === '::1';
    const transportId = options.transportId ?? 'lan-http';
    if (
        endpoint.transportId !== transportId ||
        url.protocol !== (transportId === 'lan-https' ? 'https:' : 'http:') ||
        !isIP(host) ||
        (!isPrivateAddress(host) && !(loopback && options.allowLoopbackForTests)) ||
        url.origin !== endpoint.origin
    ) {
        throw new RemoteProtocolError(
            'forbidden',
            'The selected endpoint is not an allowed private peer.',
        );
    }
    return endpoint;
}
