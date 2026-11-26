// #region Imports
import type { IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Counter-owned HTTP, event and binary operations shared with its packaged client fixture.
 *
 * @public
 */
export const fixtureCounterRoutes: readonly IRemoteRouteDefinition[] = Object.freeze([
    {
        id: 'counter.read',
        method: 'GET',
        path: '/api/counter',
        kind: 'http',
        capabilities: ['counter:read'],
        retry: 'safe-read',
    },
    {
        id: 'counter.increment',
        method: 'POST',
        path: '/api/counter',
        kind: 'http',
        capabilities: ['counter:write'],
        retry: 'never',
        maxRequestBytes: 1024,
    },
    {
        id: 'counter.events',
        method: 'GET',
        path: '/api/events',
        kind: 'sse',
        capabilities: ['counter:read'],
        retry: 'safe-read',
    },
    {
        id: 'counter.socket',
        method: 'GET',
        path: '/api/socket',
        kind: 'websocket',
        capabilities: ['counter:read'],
        retry: 'never',
    },
    {
        id: 'counter.media',
        method: 'GET',
        path: '/api/media',
        kind: 'http',
        capabilities: ['counter:read'],
        retry: 'safe-read',
    },
    {
        id: 'counter.upload',
        method: 'POST',
        path: '/api/upload',
        kind: 'http',
        capabilities: ['counter:write'],
        retry: 'never',
        maxRequestBytes: 4 * 1024 * 1024,
    },
]);
