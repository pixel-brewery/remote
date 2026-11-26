// #region Imports
import { describe, expect, it } from 'vitest';
import { readRemoteServerEvents } from './readRemoteServerEvents.js';
// #endregion

describe('readRemoteServerEvents', () => {
    it('retains the SSE last event ID and commits a final CR-only event boundary', async () => {
        // Arrange
        const chunks = (async function* () {
            yield new TextEncoder().encode('id: checkpoint\rdata: first\r\rdata: second\r\r');
        })();
        // Act
        const values = [];
        for await (const event of readRemoteServerEvents(chunks)) values.push(event);
        // Assert
        expect(values).toEqual([
            { id: 'checkpoint', type: 'message', data: 'first' },
            { id: 'checkpoint', type: 'message', data: 'second' },
        ]);
    });
    it('handles split UTF-8 and CRLF without dispatching unfinished events', async () => {
        // Arrange
        const bytes = new TextEncoder().encode(
            'id: 4\r\nevent: changed\r\ndata: Grüße\r\n\r\ndata: unfinished',
        );
        const chunks = (async function* () {
            for (const byte of bytes) yield new Uint8Array([byte]);
        })();
        // Act
        const values = [];
        for await (const event of readRemoteServerEvents(chunks)) values.push(event);
        // Assert
        expect(values).toEqual([{ id: '4', type: 'changed', data: 'Grüße' }]);
    });
    it('bounds each event rather than the size of a network chunk', async () => {
        // Arrange
        const chunks = (async function* () {
            yield new TextEncoder().encode('data: ok\n\n'.repeat(1000));
        })();
        // Act
        let count = 0;
        for await (const _event of readRemoteServerEvents(chunks, 16)) ++count;
        // Assert
        expect(count).toBe(1000);
    });
    it('rejects an oversized unterminated line', async () => {
        // Arrange
        const chunks = (async function* () {
            yield new TextEncoder().encode('data: ' + 'x'.repeat(64));
        })();
        // Act / Assert
        await expect(
            (async () => {
                for await (const _event of readRemoteServerEvents(chunks, 16)) {
                    /* consume */
                }
            })(),
        ).rejects.toThrow('bound');
    });
});
