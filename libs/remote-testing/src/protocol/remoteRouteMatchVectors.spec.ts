// #region Imports
import { describe, expect, it } from 'vitest';
import { RemoteRouteRegistry } from '@pixel-brewery/remote-core';
import { remoteRouteMatchVectors } from './remoteRouteMatchVectors.js';
// #endregion

describe('remoteRouteMatchVectors', () => {
    it.each(remoteRouteMatchVectors)('$name', (vector) => {
        // Arrange
        const registry = new RemoteRouteRegistry(vector.routes);
        // Act
        const resolve = () => registry.match(vector.method, vector.path).id;
        // Assert
        if (vector.operationId === null) expect(resolve).toThrow();
        else expect(resolve()).toBe(vector.operationId);
    });
});
