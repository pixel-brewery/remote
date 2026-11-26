// #region Imports
import { expect, it } from 'vitest';
import { createBrowserOperationId } from './createBrowserOperationId.js';
// #endregion

it('creates operation IDs when only insecure-context getRandomValues exists', () => {
    // Arrange
    const cryptography = {
        getRandomValues<T extends ArrayBufferView | null>(array: T): T {
            if (array instanceof Uint8Array) array.fill(255);
            return array;
        },
    };
    // Act
    const value = createBrowserOperationId(cryptography);
    // Assert
    expect(value).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
});
