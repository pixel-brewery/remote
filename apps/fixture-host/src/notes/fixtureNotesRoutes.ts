// #region Imports
import type { IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Notes-owned operation registry, independent of counter routes and schemas.
 *
 * @public
 */
export const fixtureNotesRoutes: readonly IRemoteRouteDefinition[] = Object.freeze([
    {
        id: 'notes.list',
        method: 'GET',
        path: '/api/notes',
        kind: 'http',
        capabilities: ['notes:read'],
        retry: 'safe-read',
    },
    {
        id: 'notes.create',
        method: 'POST',
        path: '/api/notes',
        kind: 'http',
        capabilities: ['notes:write'],
        retry: 'never',
        maxRequestBytes: 8192,
    },
    {
        id: 'notes.remove',
        method: 'DELETE',
        path: '/api/notes/:id',
        kind: 'http',
        capabilities: ['notes:write'],
        retry: 'never',
    },
]);
