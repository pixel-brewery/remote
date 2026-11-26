// #region Imports
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { WebSocket } from 'ws';
import { z } from 'zod';
import type { IRemoteApplicationAdapter } from '@pixel-brewery/remote-node/host';
import { RemoteProtocolError, type IRemoteRequestContext } from '@pixel-brewery/remote-protocol';
// #endregion

const incrementSchema = z.strictObject({ delta: z.number().int().min(1).max(100) });
const socketMessageSchema = z.strictObject({
    kind: z.literal('echo'),
    value: z.string().max(4096),
});

/**
 * In-memory counter application proving generic request, event and media composition.
 *
 * @remarks Counter state belongs to this fixture, not the SDK authorization store.
 * @public
 */
export class FixtureCounterAdapter implements IRemoteApplicationAdapter {
    // #region Fields
    private _value = 0;
    private readonly _listeners = new Set<(value: number) => void>();
    // #endregion
    // #region Methods
    /**
     * Executes only counter-owned operations after SDK device admission.
     *
     * @param request - Original product request, including its Range header and streamed JSON body.
     * @param response - Original response preserving status, event flushing and binary bytes.
     * @param context - Admitted device and registered counter operation.
     * @returns Resolves after the response is completed or its cancelable SSE subscription is installed.
     * @remarks Uploads count each original request chunk as it flows. The fixture never collects the multipart body in memory.
     * @throws RemoteProtocolError for invalid counter input or an unknown fixture operation.
     * @public
     */
    public async handle(
        request: IncomingMessage,
        response: ServerResponse,
        context: IRemoteRequestContext,
    ): Promise<void> {
        switch (context.operationId) {
            case 'counter.upload': {
                let bytes = 0;
                for await (const chunk of request) {
                    bytes += Buffer.isBuffer(chunk)
                        ? chunk.byteLength
                        : Buffer.byteLength(chunk as Uint8Array);
                    if (bytes > 4 * 1024 * 1024)
                        throw new RemoteProtocolError(
                            'resource-limit',
                            'The upload exceeds its registered limit.',
                        );
                }
                this.json(response, {
                    bytes,
                    contentType: request.headers['content-type'] ?? 'application/octet-stream',
                });
                return;
            }
            case 'counter.read':
                this.json(response, { value: this._value });
                return;
            case 'counter.increment': {
                const chunks: Buffer[] = [];
                let bytes = 0;
                for await (const chunk of request) {
                    const data = Buffer.from(chunk as Uint8Array);
                    bytes += data.byteLength;
                    if (bytes > 1024)
                        throw new RemoteProtocolError(
                            'resource-limit',
                            'The counter command is too large.',
                        );
                    chunks.push(data);
                }
                let input: unknown;
                try {
                    input = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
                } catch {
                    throw new RemoteProtocolError(
                        'invalid-request',
                        'The counter command must be JSON.',
                    );
                }
                const parsed = incrementSchema.safeParse(input);
                if (!parsed.success)
                    throw new RemoteProtocolError(
                        'invalid-request',
                        'The counter increment must be an integer from one through one hundred.',
                    );
                this._value += parsed.data.delta;
                for (const listener of this._listeners) listener(this._value);
                this.json(response, { value: this._value });
                return;
            }
            case 'counter.events': {
                response.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                });
                const write = (value: number) => {
                    if (!response.write(`event: counter\ndata: ${JSON.stringify({ value })}\n\n`))
                        response.destroy();
                };
                const close = () => {
                    this._listeners.delete(write);
                    context.signal.removeEventListener('abort', close);
                    response.end();
                };
                this._listeners.add(write);
                context.signal.addEventListener('abort', close, { once: true });
                write(this._value);
                return;
            }
            case 'counter.media': {
                const media = Buffer.from('0123456789abcdefghijklmnopqrstuvwxyz', 'utf8');
                const range = request.headers.range;
                if (!range) {
                    response
                        .writeHead(200, {
                            'Content-Type': 'application/octet-stream',
                            'Accept-Ranges': 'bytes',
                            'Content-Length': media.length,
                        })
                        .end(media);
                    return;
                }
                const match = /^bytes=(\d+)-(\d*)$/u.exec(range);
                const start = match ? Number(match[1]) : -1;
                const end = match && match[2] ? Number(match[2]) : media.length - 1;
                if (start < 0 || start >= media.length || end < start || end >= media.length) {
                    response.writeHead(416, { 'Content-Range': `bytes */${media.length}` }).end();
                    return;
                }
                response
                    .writeHead(206, {
                        'Content-Type': 'application/octet-stream',
                        'Accept-Ranges': 'bytes',
                        'Content-Range': `bytes ${start}-${end}/${media.length}`,
                        'Content-Length': end - start + 1,
                    })
                    .end(media.subarray(start, end + 1));
                return;
            }
            default:
                throw new RemoteProtocolError(
                    'forbidden',
                    'The counter operation is not registered.',
                );
        }
    }

    /**
     * Installs a bounded typed echo protocol to exercise native WebSocket forwarding.
     *
     * @param socket - Authenticated counter event socket owned by the SDK host.
     * @param context - Device cancellation scope; revocation removes all fixture message listeners.
     * @returns Resolves after message validation and cancellation are installed.
     * @public
     */
    public async webSocket(socket: WebSocket, context: IRemoteRequestContext): Promise<void> {
        socket.on('message', (bytes, binary) => {
            const data = Buffer.isBuffer(bytes)
                ? bytes
                : Array.isArray(bytes)
                  ? Buffer.concat(bytes)
                  : Buffer.from(bytes);
            if (binary || data.byteLength > 8192) {
                socket.close(1008, 'Invalid counter message.');
                return;
            }
            let parsed;
            try {
                parsed = socketMessageSchema.safeParse(
                    JSON.parse(data.toString('utf8')) as unknown,
                );
            } catch {
                socket.close(1008, 'Invalid counter message.');
                return;
            }
            if (!parsed.success || socket.bufferedAmount > 1_048_576) {
                socket.close(1008, 'Invalid counter message.');
                return;
            }
            socket.send(JSON.stringify({ kind: 'echo', value: parsed.data.value }));
        });
        context.signal.addEventListener('abort', () => socket.removeAllListeners('message'), {
            once: true,
        });
    }

    private json(response: ServerResponse, value: unknown): void {
        response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(value));
    }
    // #endregion
}
