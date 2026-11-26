/**
 * Yield one fetch response body as chunks and always release its reader.
 *
 * @remarks An early consumer exit or failure cancels the remaining body; completion only releases the lock.
 * @param response - Fetch response whose body has not been read or locked yet.
 * @returns Async chunk sequence owning the body reader until it finishes.
 * @throws Error when the response has no body.
 * @internal
 */
export async function* readResponseChunks(
    response: Response,
): AsyncGenerator<Uint8Array, void, undefined> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('The response has no body.');
    let completed = false;
    try {
        for (;;) {
            const next = await reader.read();
            if (next.done) {
                completed = true;
                return;
            }
            yield next.value;
        }
    } finally {
        if (!completed) await reader.cancel().catch(() => undefined);
        reader.releaseLock();
    }
}
