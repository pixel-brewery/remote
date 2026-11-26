// #region Imports
import { describe, expect, it } from 'vitest';
import { remoteContentPolicySchema } from './remoteContentPolicySchema.js';
// #endregion

describe('remoteContentPolicySchema', () => {
    it('defaults every source permission to false and freezes the resolved policy', () => {
        // Arrange
        const input = {};
        // Act
        const result = remoteContentPolicySchema.parse(input);
        // Assert
        expect(result).toEqual({
            allowHttpsImages: false,
            allowHttpsMedia: false,
            allowHttpsConnections: false,
        });
        expect(Object.isFrozen(result)).toBe(true);
    });
    it('accepts independent HTTPS content flags and rejects script authority or non-boolean input', () => {
        // Arrange
        const valid = {
            allowHttpsImages: true,
            allowHttpsMedia: true,
            allowHttpsConnections: true,
        };
        // Act
        const result = remoteContentPolicySchema.parse(valid);
        // Assert
        expect(result).toEqual(valid);
        expect(remoteContentPolicySchema.safeParse({ allowHttpsScripts: true }).success).toBe(
            false,
        );
        expect(remoteContentPolicySchema.safeParse({ allowHttpsImages: 'true' }).success).toBe(
            false,
        );
    });
});
