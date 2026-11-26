// #region Imports
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { WebSocket } from 'ws';
import type { IRemoteRequestContext, IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
// #endregion
/**
 * Product-owned request pipeline. Original streams reach the canonical product validators.
 *
 * @public
 */
export interface IRemoteApplicationAdapter {
    /**
     * Optionally enforces product resource and state rules after device capability admission and before dispatch.
     * @param route - Registered operation being admitted.
     * @param context - Authenticated device scope and owned cancellation signal.
     * @returns Resolves only when this device may perform the operation in the current product state.
     * @throws An application error when the operation must be denied.
     *
     * @public
     */
    authorize?(route: IRemoteRouteDefinition, context: IRemoteRequestContext): Promise<void>;
    /**
     * Runs the application-owned HTTP pipeline using the original request and response streams.
     * @param request - Original IncomingMessage, retaining headers, multipart boundaries and incremental bytes.
     * @param response - Original ServerResponse; preserve status, relevant headers and backpressure.
     * @param context - Admitted device identity and signal aborted on disconnect or revocation.
     * @returns Resolves after dispatch is established or completed. Streaming owners must observe the context signal.
     * @throws A product validation, authorization or dispatch error.
     *
     * @public
     */
    handle(
        request: IncomingMessage,
        response: ServerResponse,
        context: IRemoteRequestContext,
    ): Promise<void>;
    /**
     * Optionally handles one registered, authenticated product event stream.
     * @param socket - Open WebSocket owned by the host; validate every product message.
     * @param context - Admitted operation and device scope; cancellation terminates device-owned work.
     * @returns Resolves after event handling is installed. The product must release its own subscriptions when the signal aborts.
     * @throws An error when event setup fails; the host closes the socket.
     *
     * @public
     */
    webSocket?(socket: WebSocket, context: IRemoteRequestContext): Promise<void>;
}
