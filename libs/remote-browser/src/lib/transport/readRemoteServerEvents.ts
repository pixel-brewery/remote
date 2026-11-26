// #region Imports
import type { IRemoteServerEvent } from './interfaces/IRemoteServerEvent.js';
// #endregion

/**
 * Decode bounded SSE events incrementally across UTF-8 and CRLF chunk boundaries.
 * @param chunks - Stream owned by the caller; iterator cancellation propagates upstream.
 * @param maxEventBytes - Per-event memory bound in UTF-8 bytes, default 65536.
 * @returns Events only after their terminating empty line; no replay or JSON policy is inferred.
 * @throws Error when a retained line or event exceeds the bound or UTF-8 is malformed.
 * @public
 */
export async function* readRemoteServerEvents(
    chunks: AsyncIterable<Uint8Array>,
    maxEventBytes = 65_536,
): AsyncIterable<IRemoteServerEvent> {
    if (!Number.isSafeInteger(maxEventBytes) || maxEventBytes < 1)
        throw new RangeError('The SSE bound must be positive.');
    const decoder = new TextDecoder('utf-8', { fatal: true }),
        encoder = new TextEncoder();
    let pending = '',
        type = 'message',
        id: string | undefined,
        data: string[] = [],
        retained = 0;
    const parse = (line: string): IRemoteServerEvent | undefined => {
        if (!line) {
            const event = data.length
                ? { type, data: data.join('\n'), ...(id === undefined ? {} : { id }) }
                : undefined;
            type = 'message';
            data = [];
            retained = 0;
            return event;
        }
        if (encoder.encode(line).length > maxEventBytes)
            throw new Error('The SSE line exceeds the configured bound.');
        if (line.startsWith(':')) return undefined;
        retained += encoder.encode(line).length;
        if (retained > maxEventBytes)
            throw new Error('The SSE event exceeds the configured bound.');
        const separator = line.indexOf(':'),
            field = separator < 0 ? line : line.slice(0, separator),
            value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /u, '');
        if (field === 'data') data.push(value);
        else if (field === 'event') type = value;
        else if (field === 'id' && !value.includes('\0')) id = value;
        return undefined;
    };
    for await (const chunk of chunks) {
        pending += decoder.decode(chunk, { stream: true });
        for (;;) {
            const match = /\r\n|\r|\n/u.exec(pending);
            if (!match || (match[0] === '\r' && match.index === pending.length - 1)) break;
            const event = parse(pending.slice(0, match.index));
            pending = pending.slice(match.index + match[0].length);
            if (event) yield event;
        }
        if (encoder.encode(pending).length > maxEventBytes + 4)
            throw new Error('The SSE line exceeds the configured bound.');
    }
    pending += decoder.decode();
    if (pending.endsWith('\r')) {
        const event = parse(pending.slice(0, -1));
        if (event) yield event;
    }
}
