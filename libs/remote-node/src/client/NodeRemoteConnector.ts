// #region Imports
import type { IRemoteConnector } from '@pixel-brewery/remote-client';
import type { IRemoteEndpoint } from '@pixel-brewery/remote-protocol';
import type { INodeRemoteConnectorOptions } from './interfaces/INodeRemoteConnectorOptions.js';
import { NodeRemoteClientTransport } from './NodeRemoteClientTransport.js';
import { validatePrivateRemoteEndpoint } from './validatePrivateRemoteEndpoint.js';
// #endregion
/**
 * Opens one explicitly selected numeric private peer; no DNS, redirects or peer discovery is performed.
 *
 * @public
 */
export class NodeRemoteConnector implements IRemoteConnector {
    // #region Ctor
    /**
     * Binds app-owned identity, routes, credential storage and certificate trust.
     *
     * @param _options - Application-owned composition, routes and runtime limits for this owner.
     * @public
     */
    public constructor(private readonly _options: INodeRemoteConnectorOptions) {
        this.id = _options.transportId ?? 'lan-http';
    }
    // #endregion
    // #region Properties
    /**
     * Endpoint transport understood by this connector.
     *
     * @public
     */
    public readonly id: string;
    // #endregion
    // #region Methods
    /**
     * Validates the private destination and verifies its identity before loading any credential.
     *
     * @param input - Untrusted input validated by the canonical contract before use.
     * @param signal - Cancellation signal for this operation; cancellation never rolls back an application mutation already admitted by the host.
     * @returns An owned transport whose public host identity has been verified before credential restoration.
     * @remarks The connector permits only explicit numeric private peers and never follows redirects. The loopback exception is for tests only.
     * @throws RemoteProtocolError for a disallowed peer, cancellation, protocol incompatibility or network failure.
     * @public
     */
    public async connect(
        input: IRemoteEndpoint,
        signal: AbortSignal,
    ): Promise<NodeRemoteClientTransport> {
        const endpoint = validatePrivateRemoteEndpoint(input, this._options);
        const transport = new NodeRemoteClientTransport(endpoint, this._options, signal);
        try {
            await transport.describe(signal);
            return transport;
        } catch (cause) {
            await transport.dispose();
            throw cause;
        }
    }
    // #endregion
}
