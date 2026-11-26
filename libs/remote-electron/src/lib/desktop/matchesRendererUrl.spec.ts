// #region Imports
import { describe, expect, it } from 'vitest';
import { matchesRendererUrl } from './matchesRendererUrl.js';
// #endregion

describe('matchesRendererUrl', () => {
    it('matches the same packaged file with any hash route and the exact HTTP origin', () => {
        // Arrange
        const file = 'file:///app/renderer/index.html';
        // Act / Assert
        expect(matchesRendererUrl('file:///app/renderer/index.html#/settings', file)).toBe(true);
        expect(matchesRendererUrl('file:///app/renderer/other.html', file)).toBe(false);
        expect(matchesRendererUrl('http://127.0.0.1:4100/view', 'http://127.0.0.1:4100')).toBe(
            true,
        );
        expect(matchesRendererUrl('http://127.0.0.1:4101/', 'http://127.0.0.1:4100')).toBe(false);
    });
    it('rejects user information, unparsable and oversized values', () => {
        // Arrange
        const origin = 'http://127.0.0.1:4100';
        // Act / Assert
        expect(matchesRendererUrl('http://user@127.0.0.1:4100/', origin)).toBe(false);
        expect(matchesRendererUrl('not a url', origin)).toBe(false);
        expect(matchesRendererUrl(origin + '/' + 'a'.repeat(8192), origin)).toBe(false);
        expect(matchesRendererUrl('data:text/html,x', 'data:text/html,x')).toBe(false);
    });
});
