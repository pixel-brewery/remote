// #region Imports
import { describe, it, expect } from 'vitest';
import { RemoteRouteRegistry } from './RemoteRouteRegistry.js';
import type { IRemotePrincipal, IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
// #endregion
const principal: IRemotePrincipal = {
    appId: 'fixture',
    hostId: 'host',
    deviceId: 'device',
    capabilities: ['read'],
};
const route: IRemoteRouteDefinition = {
    id: 'items.read',
    method: 'GET',
    path: '/api/items/:id',
    kind: 'http',
    capabilities: ['read'],
    retry: 'safe-read',
};
describe('RemoteRouteRegistry', () => {
    it('admits explicit methods and gives exact routes precedence over parameters', () => {
        // Arrange
        const registry = new RemoteRouteRegistry([
            route,
            { ...route, id: 'metadata', path: '/api/items/metadata' },
        ]);
        // Act / Assert
        expect(registry.authorize('GET', '/api/items/metadata?filter=a', principal).id).toBe(
            'metadata',
        );
        expect(registry.authorize('GET', '/api/items/123', principal).id).toBe('items.read');
        expect(() => registry.authorize('POST', '/api/items/123', principal)).toThrow();
    });
    it('rejects insufficient capabilities and ambiguous paths', () => {
        // Arrange
        const registry = new RemoteRouteRegistry([{ ...route, capabilities: ['write'] }]);
        // Act / Assert
        expect(() => registry.authorize('GET', '/api/items/123', principal)).toThrow();
        for (const path of [
            '/api/items/../secret',
            '/api/items/%2e%2e',
            '/api/items/a%2fb',
            '//api/items/a',
            'http://other/api/items/a',
        ]) {
            expect(() => registry.match('GET', path)).toThrow();
        }
    });
    it('rejects reserved routes and automatic replay declarations for writes', () => {
        // Arrange / Act / Assert
        expect(() => new RemoteRouteRegistry([{ ...route, path: '/__remote/v1/host' }])).toThrow();
        expect(() => new RemoteRouteRegistry([{ ...route, method: 'POST' }])).toThrow();
    });
});
