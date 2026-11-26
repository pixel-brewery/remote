// #region Imports
import type { IncomingMessage, ServerResponse } from 'node:http';
import { RemoteProtocolError, type IRemoteRequestContext } from '@pixel-brewery/remote-protocol';
import type { IRemoteApplicationAdapter } from './interfaces/IRemoteApplicationAdapter.js';
// #endregion

const transportHeaders: ReadonlySet<string> = new Set(['authorization', 'cookie', 'origin']);

/**
 * Creates the `application.handle` implementation that hands SDK-admitted requests to an existing HTTP pipeline.
 *
 * @remarks
 * The host calls the handler only after device, route, capability and optional
 * product admission succeeded. The handler records the admission, then removes
 * the device transport headers `authorization`, `cookie` and `origin` from both
 * the parsed and raw header views, so the application never mistakes a device
 * credential for its own authentication and never re-evaluates the already
 * verified LAN origin. The original request and response streams are passed on
 * unchanged otherwise. The admission is released exactly once, on response
 * finish, response close or context abort. A synchronous dispatch error, or a
 * rejection of a returned promise, releases the admission and is rethrown to the
 * host, which then reports the failure. An already aborted context is refused
 * without admission or dispatch.
 *
 * @param dispatch - Existing application pipeline, for example a framework's Node request listener.
 * @param admit - Provenance recorder such as {@link RemoteRequestAdmissions.admit}; returns its release.
 * @returns A handler suitable for {@link IRemoteApplicationAdapter.handle}.
 *
 * @example
 * ```ts
 * const admissions = new RemoteRequestAdmissions();
 * const application = {
 *     handle: createRemoteApplicationHandler(requestListener, (request, context) =>
 *         admissions.admit(request, context),
 *     ),
 * };
 * ```
 *
 * @public
 */
export function createRemoteApplicationHandler(
    dispatch: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>,
    admit: (request: IncomingMessage, context: IRemoteRequestContext) => () => void,
): IRemoteApplicationAdapter['handle'] {
    return async (request, response, context) => {
        if (context.signal.aborted)
            throw new RemoteProtocolError(
                'unauthorized',
                'The device session ended before dispatch.',
            );
        const release = admit(request, context);
        let released = false;
        const cleanup = (): void => {
            if (released) return;
            released = true;
            response.off('finish', cleanup);
            response.off('close', cleanup);
            context.signal.removeEventListener('abort', cleanup);
            release();
        };
        response.once('finish', cleanup);
        response.once('close', cleanup);
        context.signal.addEventListener('abort', cleanup, { once: true });
        try {
            strip(request);
            await dispatch(request, response);
        } catch (error) {
            cleanup();
            throw error;
        }
    };
}

/**
 * Removes device transport headers from every header view of one request.
 *
 * @param request - Admitted request whose headers are rewritten in place.
 *
 * @internal
 */
function strip(request: IncomingMessage): void {
    // Materialize the lazily derived views first; they are otherwise rebuilt from the original header count.
    const headers = request.headers;
    const distinct = request.headersDistinct;
    for (const name of transportHeaders) {
        delete headers[name];
        delete distinct[name];
    }
    request.rawHeaders = request.rawHeaders.filter(
        (_, index, raw) => !transportHeaders.has((raw[index - (index % 2)] ?? '').toLowerCase()),
    );
}
