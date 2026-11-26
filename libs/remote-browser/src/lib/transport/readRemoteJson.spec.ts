// #region Imports
import { describe, expect, it, vi } from 'vitest';
import type { IRemoteByteResponse } from '@pixel-brewery/remote-protocol';
import { readRemoteJson } from './readRemoteJson.js';
// #endregion

const response = (
    status: number,
    text: string,
): IRemoteByteResponse & { cancel: () => Promise<void> } => {
    const bytes = new TextEncoder().encode(text);
    return {
        status,
        headers: {},
        body: (async function* () {
            yield bytes.slice(0, 2);
            yield bytes.slice(2);
        })(),
        cancel: vi.fn(async () => undefined),
    };
};

describe('readRemoteJson', () => {
    it('decodes a chunked JSON document and always releases the response', async () => {
        // Arrange
        const source = response(200, '{"mode":"local"}');
        // Act
        const value = await readRemoteJson(source);
        // Assert
        expect(value).toEqual({ mode: 'local' });
        expect(source.cancel).toHaveBeenCalledTimes(1);
    });
    it('rejects failed statuses, oversized documents and invalid JSON after cancelling them', async () => {
        // Arrange
        const failed = response(503, '{}');
        const oversized = response(200, `"${'x'.repeat(64)}"`);
        const malformed = response(200, '{"mode":');
        // Act
        const results = await Promise.allSettled([
            readRemoteJson(failed),
            readRemoteJson(oversized, 16),
            readRemoteJson(malformed),
        ]);
        // Assert
        expect(results.map((result) => result.status)).toEqual([
            'rejected',
            'rejected',
            'rejected',
        ]);
        expect(
            results.map((result) =>
                result.status === 'rejected' && result.reason instanceof Error
                    ? result.reason.name
                    : 'none',
            ),
        ).toEqual(['Error', 'RangeError', 'SyntaxError']);
        for (const source of [failed, oversized, malformed])
            expect(source.cancel).toHaveBeenCalledTimes(1);
    });
});
