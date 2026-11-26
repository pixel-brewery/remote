// #region Imports
import { describe, expect, it } from 'vitest';
import { remoteContentPolicySchema } from '@pixel-brewery/remote-protocol';
import { remoteContractVectors } from './remoteContractVectors.js';
// #endregion

describe('remoteContractVectors', () => {
    it('provides canonical independently selectable content permissions and authority/type rejection cases', () => {
        // Arrange
        const vectors = remoteContractVectors;
        // Act
        const valid = vectors.contentPolicies.map(
            (value) => remoteContentPolicySchema.safeParse(value).success,
        );
        const invalid = vectors.invalidContentPolicies.map(
            (value) => remoteContentPolicySchema.safeParse(value).success,
        );
        // Assert
        expect(valid).toEqual([true, true, true, true, true]);
        expect(invalid).toEqual([false, false, false, false]);
    });
});
