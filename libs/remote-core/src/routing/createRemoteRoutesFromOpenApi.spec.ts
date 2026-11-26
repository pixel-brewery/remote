// #region Imports
import { describe, expect, it } from 'vitest';
import { createRemoteRoutesFromOpenApi } from './createRemoteRoutesFromOpenApi.js';
import type { IRemoteOpenApiRoutePolicy } from './interfaces/IRemoteOpenApiRoutePolicy.js';
// #endregion

const policy: IRemoteOpenApiRoutePolicy = {
    include: ['/api/documents', '/api/events', '/api/health/ready'],
    exclude: ['/api/documents/export'],
    readCapability: 'documents:read',
    writeCapability: 'documents:write',
    requestLimits: [
        { prefix: '/api/documents', maxRequestBytes: 1024 },
        { prefix: '/api/documents/uploads', maxRequestBytes: 26214400 },
    ],
};
const operation = (operationId: string, media = 'application/json') => ({
    operationId,
    responses: { '200': { description: 'Success', content: { [media]: {} } } },
});

describe('createRemoteRoutesFromOpenApi', () => {
    it('admits only allowlisted operations with read/write capability, retry and quota policy', () => {
        // Arrange
        const document = {
            paths: {
                '/api/documents/{documentId}/versions/{version}': {
                    get: operation('readVersion'),
                    head: operation('probeVersion'),
                    delete: operation('removeVersion'),
                    options: operation('preflight'),
                    parameters: [],
                },
                '/api/documents/uploads': { post: operation('upload') },
                '/api/documents/export': { get: operation('exportDocuments') },
                '/api/documentsets': { get: operation('unrelatedPrefix') },
                '/api/accounts': { post: operation('createAccount') },
                '/api/health/ready': { get: operation('readiness') },
                '/api/health/live': { get: operation('liveness') },
            },
        };
        // Act
        const routes = createRemoteRoutesFromOpenApi(document, policy);
        // Assert
        expect(routes.map((route) => route.id)).toEqual([
            'readVersion',
            'probeVersion',
            'removeVersion',
            'upload',
            'readiness',
        ]);
        expect(routes[0]).toEqual({
            id: 'readVersion',
            method: 'GET',
            path: '/api/documents/:documentId/versions/:version',
            kind: 'http',
            capabilities: ['documents:read'],
            retry: 'safe-read',
            maxRequestBytes: 1024,
        });
        expect(routes[1]).toMatchObject({ method: 'HEAD', retry: 'safe-read' });
        expect(routes[2]).toMatchObject({
            method: 'DELETE',
            capabilities: ['documents:write'],
            retry: 'never',
        });
        expect(routes[3]).toMatchObject({ method: 'POST', maxRequestBytes: 26214400 });
        expect(routes[4]).toMatchObject({ maxRequestBytes: 4194304 });
        expect(Object.isFrozen(routes)).toBe(true);
        expect(routes.every((route) => Object.isFrozen(route))).toBe(true);
        expect(routes.every((route) => Object.isFrozen(route.capabilities))).toBe(true);
    });

    it('derives non-retryable event streams from inline media types, including parameters', () => {
        // Arrange
        const document = {
            paths: {
                '/api/events': {
                    get: operation('events', 'Text/Event-Stream; charset=utf-8'),
                },
                '/api/events/{channel}': {
                    get: { operationId: 'referenced', responses: { '200': { $ref: '#/x' } } },
                    post: { operationId: 'publish' },
                },
            },
        };
        // Act
        const routes = createRemoteRoutesFromOpenApi(document, policy);
        // Assert
        expect(routes).toEqual([
            expect.objectContaining({ id: 'events', kind: 'sse', retry: 'never' }),
            expect.objectContaining({ id: 'referenced', kind: 'http', retry: 'safe-read' }),
            expect.objectContaining({ id: 'publish', kind: 'http', retry: 'never' }),
        ]);
    });

    it('rejects missing, oversized and duplicate operation identifiers', () => {
        // Arrange
        const shared = { get: operation('same') };
        // Act / Assert
        expect(() =>
            createRemoteRoutesFromOpenApi(
                { paths: { '/api/documents/a': shared, '/api/documents/b': shared } },
                policy,
            ),
        ).toThrow('unique stable');
        expect(() =>
            createRemoteRoutesFromOpenApi(
                { paths: { '/api/documents': { get: { responses: {} } } } },
                policy,
            ),
        ).toThrow('unique stable');
        expect(() =>
            createRemoteRoutesFromOpenApi(
                { paths: { '/api/documents': { get: operation('x'.repeat(161)) } } },
                policy,
            ),
        ).toThrow('unique stable');
    });

    it('rejects partial, duplicate, colon-literal and registry-inadmissible path patterns', () => {
        // Arrange
        const get = { get: operation('read') };
        const cases = [
            '/api/documents/item-{id}',
            '/api/documents/{id}/{id}',
            '/api/documents/{_hidden}',
            '/api/documents/:id',
            '/api/documents/list?query',
        ];
        // Act / Assert
        for (const path of cases)
            expect(() => createRemoteRoutesFromOpenApi({ paths: { [path]: get } }, policy)).toThrow(
                expect.objectContaining({ code: 'invalid-request' }),
            );
        expect(() =>
            createRemoteRoutesFromOpenApi(
                {
                    paths: {
                        '/api/documents/{first}': { get: operation('first') },
                        '/api/documents/{second}': { get: operation('second') },
                    },
                },
                policy,
            ),
        ).toThrow('registered more than once');
        expect(() =>
            createRemoteRoutesFromOpenApi(
                { paths: { '/__remote/v1/host': get } },
                { ...policy, include: ['/__remote'] },
            ),
        ).toThrow('route definition is invalid');
    });

    it('rejects invalid policies before reading operations', () => {
        // Arrange
        const document = { paths: {} };
        const invalid: IRemoteOpenApiRoutePolicy[] = [
            { ...policy, include: [] },
            { ...policy, include: ['/api/'] },
            { ...policy, include: ['api'] },
            { ...policy, exclude: ['/api/%61'] },
            { ...policy, readCapability: '' },
            { ...policy, writeCapability: 'x'.repeat(161) },
            { ...policy, maxRequestBytes: -1 },
            { ...policy, requestLimits: [{ prefix: '/api', maxRequestBytes: 1.5 }] },
            {
                ...policy,
                requestLimits: [
                    { prefix: '/api', maxRequestBytes: 1 },
                    { prefix: '/api', maxRequestBytes: 2 },
                ],
            },
        ];
        // Act / Assert
        for (const candidate of invalid)
            expect(() => createRemoteRoutesFromOpenApi(document, candidate)).toThrow(
                expect.objectContaining({ code: 'invalid-request' }),
            );
        expect(createRemoteRoutesFromOpenApi(document, policy)).toEqual([]);
    });
});
