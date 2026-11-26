// #region Imports
import type { IRemoteConnector, IRemoteClientTransport } from '@pixel-brewery/remote-client';
import {
    remoteEndpointSchema,
    RemoteProtocolError,
    type IRemoteEndpoint,
} from '@pixel-brewery/remote-protocol';
// #endregion
/**
 * Scripted connector exposing attempted endpoint selection without requiring real network I/O.
 *
 * @public
 */
export class FakeRemoteConnector implements IRemoteConnector {
    // #region Fields
    private readonly _connections: IRemoteEndpoint[] = [];
    // #endregion
    // #region Ctor
    /**
     * Supplies the transport factory so each test controls real responses and race boundaries.
     *
     * @param id - Transport identifier used to select this connector.
     * @param _create - Scripted transport factory called once per admitted connection attempt.
     * @public
     */
    public constructor(
        id: string,
        private readonly _create: (
            endpoint: IRemoteEndpoint,
            signal: AbortSignal,
        ) => Promise<IRemoteClientTransport>,
    ) {
        this.id = id;
    }
    // #endregion
    // #region Properties
    /**
     * Transport identifier selected by this test connector.
     *
     * @public
     */
    public readonly id: string;

    /**
     * Detached endpoint attempts, in dispatch order.
     *
     * @returns Detached endpoint attempts in their original dispatch order.
     * @public
     */
    public get connections(): readonly IRemoteEndpoint[] {
        return structuredClone(this._connections);
    }
    // #endregion
    // #region Methods
    /**
     * Invokes the configured factory once, rejecting already-cancelled attempts.
     *
     * @param input - Untrusted input validated by the canonical contract before use.
     * @param signal - Cancellation signal for this attempt. A transport returned after cancellation is disposed before the attempt rejects.
     * @returns The scripted transport created for this endpoint; the test factory defines descriptor and authentication behavior.
     * @public
     */
    public async connect(
        input: IRemoteEndpoint,
        signal: AbortSignal,
    ): Promise<IRemoteClientTransport> {
        if (signal.aborted)
            throw new RemoteProtocolError('disposed', 'The test connection was cancelled.');
        const endpoint = remoteEndpointSchema.parse(input);
        if (endpoint.transportId !== this.id)
            throw new RemoteProtocolError(
                'incompatible',
                'The test connector does not match this transport.',
            );
        this._connections.push(endpoint);
        const transport = await this._create(endpoint, signal);
        if (signal.aborted) {
            await transport.dispose();
            throw new RemoteProtocolError('disposed', 'The test connection was cancelled.');
        }
        return transport;
    }
    // #endregion
}
