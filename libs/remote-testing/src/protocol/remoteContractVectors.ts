// #region Imports
import type { IRemoteContractVectors } from './interfaces/IRemoteContractVectors.js';
// #endregion
/**
 * Fixed public wire examples and rejection cases for independently implemented adapters.
 *
 * @public
 */
export const remoteContractVectors: IRemoteContractVectors = Object.freeze({
    host: Object.freeze({
        identity: Object.freeze({ appId: 'fixture.notes', hostId: 'installation-one' }),
        name: 'Fixture Notes',
        protocolVersion: 1 as const,
        endpoints: Object.freeze([
            { id: 'lan-http', transportId: 'lan-http', origin: 'http://192.168.1.24:49152' },
        ]),
    }),
    bootstrap: Object.freeze({
        appId: 'fixture.notes',
        hostId: 'installation-one',
        origin: 'http://192.168.1.24:49152',
        challenge: 'fixture_challenge_32_bytes_minimum_12345',
        expiresAt: '2026-01-01T00:05:00.000Z',
    }),
    session: Object.freeze({
        host: {
            identity: { appId: 'fixture.notes', hostId: 'installation-one' },
            name: 'Fixture Notes',
            protocolVersion: 1 as const,
            endpoints: [
                { id: 'lan-http', transportId: 'lan-http', origin: 'http://192.168.1.24:49152' },
            ],
        },
        principal: {
            appId: 'fixture.notes',
            hostId: 'installation-one',
            deviceId: 'device-one',
            capabilities: ['notes.read'],
        },
    }),
    invalidOrigins: Object.freeze([
        'https://example.com',
        'http://169.254.169.254',
        'http://127.0.0.1',
        'http://192.168.1.2/other',
        'http://user:pass@192.168.1.2',
    ]),
    contentPolicies: Object.freeze([
        Object.freeze({}),
        Object.freeze({ allowHttpsImages: true }),
        Object.freeze({ allowHttpsMedia: true }),
        Object.freeze({ allowHttpsConnections: true }),
        Object.freeze({
            allowHttpsImages: true,
            allowHttpsMedia: true,
            allowHttpsConnections: true,
        }),
    ]),
    invalidContentPolicies: Object.freeze([
        Object.freeze({ allowHttpsScripts: true }),
        Object.freeze({ allowHttpsImages: 'true' }),
        Object.freeze({ allowHttpsMedia: 1 }),
        Object.freeze({ allowHttpsConnections: null }),
    ]),
    invalidPaths: Object.freeze([
        '//other/api',
        'https://other/api',
        '/api/../secret',
        '/api/%2fsecret',
        '/api/%252fsecret',
        '/api/%00',
        '/api\\secret',
    ]),
});
