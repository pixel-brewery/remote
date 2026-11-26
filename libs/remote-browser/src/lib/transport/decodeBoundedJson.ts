/**
 * Collect at most a fixed number of bytes and decode them as strict UTF-8 JSON.
 *
 * @remarks Exceeding the bound stops iteration immediately, which lets the chunk owner cancel its source.
 * @param chunks - Byte sequence owned by the caller; iteration is ended early on overflow.
 * @param maximumBytes - Positive inclusive byte limit for the complete document.
 * @returns The parsed untrusted JSON value, which the caller still validates with its schema.
 * @throws RangeError when the document exceeds the bound; TypeError or SyntaxError for invalid UTF-8 or JSON.
 * @internal
 */
export async function decodeBoundedJson(
    chunks: AsyncIterable<Uint8Array>,
    maximumBytes: number,
): Promise<unknown> {
    const parts: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of chunks) {
        size += chunk.byteLength;
        if (size > maximumBytes)
            throw new RangeError('The JSON document exceeds its configured byte bound.');
        parts.push(chunk);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
        bytes.set(part, offset);
        offset += part.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
}
