// #region Imports
import { describe, it, expect } from 'vitest';
import { normalizeRemotePath } from './normalizeRemotePath.js';
// #endregion
describe('normalizeRemotePath', () => {
    it('preserves a single decoded path and excludes query data from admission', () => {
        // Arrange / Act / Assert
        expect(normalizeRemotePath('/api/items/%C3%A4?sort=title')).toBe('/api/items/ä');
        expect(normalizeRemotePath(normalizeRemotePath('/api/items/%C3%A4'))).toBe('/api/items/ä');
    });
    it('rejects traversal, double decoding, encoded controls and alternate authorities', () => {
        // Arrange / Act / Assert
        for (const path of [
            '/api/a%3fb',
            '/api/a%23b',
            '/api/100%25plain',
            '/api/%25zz',
            '/api/%00',
            '/api/%20',
            '/api/%252f',
            '/api/%252e%252e',
            '/api/%2e%2e',
            '/api/a%2fb',
            '/api/a%5cb',
            '//other/api',
            'http://other/api',
            '/api/%',
        ])
            expect(() => normalizeRemotePath(path), path).toThrow();
    });
});
