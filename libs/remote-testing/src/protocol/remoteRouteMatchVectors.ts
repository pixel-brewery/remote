// #region Imports
import type { IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
import type { IRemoteRouteMatchVector } from './interfaces/IRemoteRouteMatchVector.js';
// #endregion

const parameter: IRemoteRouteDefinition = {
    id: 'notes.remove',
    method: 'DELETE',
    path: '/api/notes/:id',
    kind: 'http',
    capabilities: ['notes:write'],
    retry: 'never',
};
const staticRead: IRemoteRouteDefinition = {
    id: 'notes.current',
    method: 'GET',
    path: '/api/notes/current',
    kind: 'http',
    capabilities: ['notes:read'],
    retry: 'safe-read',
};
const parameterRead: IRemoteRouteDefinition = {
    ...staticRead,
    id: 'notes.read',
    path: '/api/notes/:id',
};

/**
 * Serialized admission cases covering exact methods, complete parameters, canonical paths and ambiguity denial.
 *
 * @remarks The owning runtime implementation is RemoteRouteRegistry. Native adapters must produce the same winners and denials.
 * @public
 */
export const remoteRouteMatchVectors: readonly IRemoteRouteMatchVector[] = Object.freeze([
    {
        name: 'one complete parameter',
        routes: [parameter],
        method: 'DELETE',
        path: '/api/notes/one',
        operationId: 'notes.remove',
    },
    {
        name: 'query is outside route matching',
        routes: [parameter],
        method: 'DELETE',
        path: '/api/notes/one?revision=2',
        operationId: 'notes.remove',
    },
    {
        name: 'exact method required',
        routes: [parameter],
        method: 'GET',
        path: '/api/notes/one',
        operationId: null,
    },
    {
        name: 'parameter cannot be empty',
        routes: [parameter],
        method: 'DELETE',
        path: '/api/notes/',
        operationId: null,
    },
    {
        name: 'parameter cannot span segments',
        routes: [parameter],
        method: 'DELETE',
        path: '/api/notes/one/two',
        operationId: null,
    },
    {
        name: 'encoded path separator denied',
        routes: [parameter],
        method: 'DELETE',
        path: '/api/notes/one%2ftwo',
        operationId: null,
    },
    {
        name: 'double decode denied',
        routes: [parameter],
        method: 'DELETE',
        path: '/api/notes/%252e%252e',
        operationId: null,
    },
    {
        name: 'encoded question denied',
        routes: [parameter],
        method: 'DELETE',
        path: '/api/notes/a%3fb',
        operationId: null,
    },
    {
        name: 'encoded fragment denied',
        routes: [parameter],
        method: 'DELETE',
        path: '/api/notes/a%23b',
        operationId: null,
    },
    {
        name: 'decoded control denied',
        routes: [parameter],
        method: 'DELETE',
        path: '/api/notes/a%00b',
        operationId: null,
    },
    {
        name: 'malformed percent denied',
        routes: [parameter],
        method: 'DELETE',
        path: '/api/notes/%zz',
        operationId: null,
    },
    {
        name: 'literal plus remains a plus',
        routes: [{ ...staticRead, id: 'notes.plus', path: '/api/notes/a+b' }],
        method: 'GET',
        path: '/api/notes/a+b',
        operationId: 'notes.plus',
    },
    {
        name: 'static route outranks parameter',
        routes: [parameterRead, staticRead],
        method: 'GET',
        path: '/api/notes/current',
        operationId: 'notes.current',
    },
    {
        name: 'equal specificity overlap denied',
        routes: [{ ...parameterRead, path: '/api/:collection/current' }, parameterRead],
        method: 'GET',
        path: '/api/notes/current',
        operationId: null,
    },
]);
