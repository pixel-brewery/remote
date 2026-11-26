// #region Imports
import type { IncomingMessage, ServerResponse } from 'node:http';
import { normalizeRemotePath, RemoteProtocolError } from '@pixel-brewery/remote-protocol';
import type { IRemoteHostControl } from './interfaces/IRemoteHostControl.js';
import type { IRemoteHostControlOptions } from './interfaces/IRemoteHostControlOptions.js';
import { parseRemoteHostControlCommand } from './parseRemoteHostControlCommand.js';
// #endregion

const commands: readonly string[] = [
    '/status',
    '/enable',
    '/disable',
    '/reconcile',
    '/pair',
    '/revoke',
];

/**
 * Serves the closed private host-control HTTP endpoint on Node request and response objects.
 *
 * @remarks
 * The caller remains responsible for local authorization: invoke this handler
 * only for requests already proven to come from the application's own local
 * administration surface, never for device requests admitted by the remote host.
 * Route every request whose path equals or begins with the prefix here and pass
 * the original, unconsumed request whose `url` is the complete origin-form target.
 *
 * `GET <prefix>/status` returns the status. `POST <prefix>/enable`, `/disable`,
 * `/reconcile` and `/revoke` run their command and return the resulting status;
 * `POST <prefix>/pair` returns the secret-bearing invitation, which must only be
 * shown locally. Write bodies are strict JSON (`{}`, `{ "endpointId"?: string }`,
 * `{ "deviceId": string }`), parsed by {@link parseRemoteHostControlCommand}.
 * Queries, trailing slashes and unknown paths yield 404; a wrong method yields
 * 405 with `Allow`; non-JSON or invalid bodies yield 422; a declared or streamed
 * body above the limit yields 413 and closes the connection; `forbidden` yields
 * 403; a missing control, full command queue or unavailable host yields 503.
 * Every response is `no-store`; JSON responses use `application/json`, and
 * error bodies carry only `{ error: { code, message } }`.
 *
 * @param request - Locally authorized request with an unconsumed body.
 * @param response - Response owned by this handler until it resolves.
 * @param control - Host control, or undefined while the host is not yet available (503).
 * @param options - Optional prefix (default `/__host/remote/v1`) and body limit (default 2048 bytes).
 * @returns Resolves after the command completed and its response was submitted.
 * @throws RemoteProtocolError with `invalid-request` for an invalid prefix or body limit; command, validation
 * and host failures are written as HTTP errors instead. A response that can no longer carry an error is destroyed.
 *
 * @public
 */
export async function handleRemoteHostControl(
    request: IncomingMessage,
    response: ServerResponse,
    control: IRemoteHostControl | undefined,
    options: IRemoteHostControlOptions = {},
): Promise<void> {
    const prefix = options.prefix ?? '/__host/remote/v1';
    const maxBodyBytes = options.maxBodyBytes ?? 2048;
    if (!validPrefix(prefix))
        throw new RemoteProtocolError('invalid-request', 'The remote control prefix is invalid.');
    if (!Number.isInteger(maxBodyBytes) || maxBodyBytes < 2 || maxBodyBytes > 65536)
        throw new RemoteProtocolError(
            'invalid-request',
            'The remote control body limit is invalid.',
        );
    // Only an oversized body is 413; a full command queue is a temporary unavailability.
    let readingBody = false;
    try {
        const target = request.url ?? '';
        const path = target.startsWith(prefix + '/') ? target.slice(prefix.length) : '';
        if (!commands.includes(path)) {
            empty(response, 404);
            return;
        }
        const allowed = path === '/status' ? 'GET' : 'POST';
        if (request.method !== allowed) {
            response.setHeader('Allow', allowed);
            empty(response, 405);
            return;
        }
        if (!control)
            throw new RemoteProtocolError(
                'not-ready',
                'Remote host initialization has not completed.',
            );
        if (path === '/status') {
            json(response, 200, control.status());
            return;
        }
        readingBody = true;
        const body = await readBody(request, maxBodyBytes);
        readingBody = false;
        const command = parseRemoteHostControlCommand(path, body);
        switch (command.kind) {
            case 'enable':
                await control.enable();
                break;
            case 'disable':
                await control.disable();
                break;
            case 'reconcile':
                await control.reconcile();
                break;
            case 'revoke':
                await control.revokeDevice(command.deviceId);
                break;
            case 'pair':
                json(response, 200, await control.createPairing(command.endpointId));
                return;
        }
        json(response, 200, control.status());
    } catch (cause) {
        if (response.headersSent || response.destroyed) {
            response.destroy();
            return;
        }
        const error =
            cause instanceof RemoteProtocolError
                ? cause
                : new RemoteProtocolError(
                      'not-ready',
                      'The private remote command could not be completed.',
                  );
        const status =
            error.code === 'invalid-request'
                ? 422
                : error.code === 'resource-limit' && readingBody
                  ? 413
                  : error.code === 'forbidden'
                    ? 403
                    : 503;
        // An unread or partially read body must not be parsed as the next request.
        if (readingBody) response.setHeader('Connection', 'close');
        json(response, status, { error: { code: error.code, message: error.message } });
    }
}

/**
 * Reads one JSON body under both its declared and actually received byte limits.
 *
 * @param request - Original request whose body has not been consumed.
 * @param maximum - Maximum accepted body bytes.
 * @returns The parsed JSON value.
 * @throws RemoteProtocolError with `invalid-request` for non-JSON, malformed, consumed or interrupted bodies,
 * and with `resource-limit` when the declared or received length exceeds the maximum.
 *
 * @internal
 */
function readBody(request: IncomingMessage, maximum: number): Promise<unknown> {
    if (!/^application\/json(?:\s*;|$)/iu.test(request.headers['content-type'] ?? ''))
        return Promise.reject(
            new RemoteProtocolError('invalid-request', 'Private remote controls require JSON.'),
        );
    const declared = request.headers['content-length'];
    if (declared !== undefined && (!/^\d+$/u.test(declared) || Number(declared) > maximum))
        return Promise.reject(tooLarge());
    if (request.readableEnded || request.destroyed)
        return Promise.reject(
            new RemoteProtocolError(
                'invalid-request',
                'The private remote-control body is no longer readable.',
            ),
        );
    return new Promise<unknown>((resolve, reject) => {
        const chunks: Buffer[] = [];
        let length = 0;
        const settle = (error?: RemoteProtocolError): void => {
            request.off('data', data);
            request.off('end', end);
            request.off('error', interrupted);
            request.off('close', interrupted);
            if (error) {
                reject(error);
                return;
            }
            try {
                resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown);
            } catch {
                reject(
                    new RemoteProtocolError(
                        'invalid-request',
                        'The private remote-control JSON is invalid.',
                    ),
                );
            }
        };
        const data = (chunk: Buffer | string): void => {
            const bytes = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
            length += bytes.byteLength;
            if (length > maximum) {
                request.pause();
                settle(tooLarge());
                return;
            }
            chunks.push(bytes);
        };
        const end = (): void => settle();
        const interrupted = (): void =>
            settle(
                new RemoteProtocolError(
                    'invalid-request',
                    'The private remote-control body was interrupted.',
                ),
            );
        request.on('data', data);
        request.once('end', end);
        request.once('error', interrupted);
        request.once('close', interrupted);
    });
}

/**
 * Creates the fixed oversized-body failure.
 *
 * @returns A `resource-limit` protocol error without submitted values.
 *
 * @internal
 */
function tooLarge(): RemoteProtocolError {
    return new RemoteProtocolError(
        'resource-limit',
        'The private remote-control body is too large.',
    );
}

/**
 * Validates the configured command prefix.
 *
 * @param prefix - Candidate absolute path prefix.
 * @returns True for a canonical, non-root path without trailing slash, query or fragment.
 *
 * @internal
 */
function validPrefix(prefix: unknown): boolean {
    try {
        return (
            typeof prefix === 'string' &&
            prefix.length > 1 &&
            prefix.length <= 512 &&
            !prefix.endsWith('/') &&
            normalizeRemotePath(prefix) === prefix
        );
    } catch {
        return false;
    }
}

/**
 * Writes one non-cacheable JSON response.
 *
 * @param response - Response whose headers have not been sent.
 * @param status - HTTP status code.
 * @param value - JSON-serializable body.
 *
 * @internal
 */
function json(response: ServerResponse, status: number, value: unknown): void {
    const body = JSON.stringify(value);
    response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
    });
    response.end(body);
}

/**
 * Writes one non-cacheable response without a body.
 *
 * @param response - Response whose headers have not been sent.
 * @param status - HTTP status code.
 *
 * @internal
 */
function empty(response: ServerResponse, status: number): void {
    response.writeHead(status, { 'Content-Length': 0, 'Cache-Control': 'no-store' });
    response.end();
}
