// #region Imports
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import * as protocol from '@pixel-brewery/remote-protocol';
import { RemoteRouteRegistry } from '@pixel-brewery/remote-core';
import { remoteContractVectors, remoteRouteMatchVectors } from '@pixel-brewery/remote-testing';
import type { INativeProtocolVector } from './interfaces/INativeProtocolVector.js';
// #endregion

const schemas = {
    remoteHostDescriptor: protocol.remoteHostDescriptorSchema,
    remotePairingBootstrap: protocol.remotePairingBootstrapSchema,
    remotePairingRequest: protocol.remotePairingRequestSchema,
    remotePairingResponse: protocol.remotePairingResponseSchema,
    remoteSessionDescriptor: protocol.remoteSessionDescriptorSchema,
    remoteSavedConnection: protocol.remoteSavedConnectionSchema,
    remoteNativeRequest: protocol.remoteNativeRequestSchema,
    remoteNativeResponse: protocol.remoteNativeResponseSchema,
    remoteLocalView: protocol.remoteLocalViewSchema,
    remoteErrorResponse: protocol.remoteErrorResponseSchema,
    remoteContentPolicy: protocol.remoteContentPolicySchema,
} as const;

const identity = { appId: 'example.app', hostId: 'installation-example' };
const endpoint = { id: 'lan', transportId: 'lan-http', origin: 'http://192.168.1.20:4177' };
const host = { identity, name: 'Example host', protocolVersion: 1, endpoints: [endpoint] };
const principal = { ...identity, deviceId: 'example-device', capabilities: ['example.read'] };
const session = { host, principal };
const bootstrap = {
    ...identity,
    origin: endpoint.origin,
    challenge: 'example-challenge-0000000000000000',
    expiresAt: '2030-01-02T03:04:05Z',
};
const profile = {
    id: 'example-connection',
    label: 'Example',
    identity,
    endpoints: [endpoint],
    selectedEndpointId: 'lan',
};
const request = {
    attemptId: 'example-attempt-0001',
    deviceName: 'Example device',
    challenge: bootstrap.challenge,
    credentialMode: 'bearer',
};
const view = { connectionId: profile.id, identity, origin: 'http://127.0.0.1:4178' };

/**
 * Writes the native adapters' canonical protocol or checks for generated drift.
 * Refinements that JSON Schema cannot express remain explicit semantic rules and
 * have shared positive/negative conformance vectors for each native validator.
 * @param root - Nx workspace root.
 * @param mode - Write generated resources or compare without changing files.
 * @returns The number of generated platform resources.
 * @public
 */
export async function generateNativeProtocol(
    root: string,
    mode: 'write' | 'check',
): Promise<number> {
    const vectors: readonly INativeProtocolVector<keyof typeof schemas>[] = [
        ...remoteContractVectors.contentPolicies.map((value, index) => ({
            schema: 'remoteContentPolicy' as const,
            name: `content-policy-${index}`,
            valid: true,
            value,
        })),
        ...remoteContractVectors.invalidContentPolicies.map((value, index) => ({
            schema: 'remoteContentPolicy' as const,
            name: `invalid-content-policy-${index}`,
            valid: false,
            value,
        })),
        { schema: 'remoteHostDescriptor', name: 'host', valid: true, value: host },
        {
            schema: 'remoteHostDescriptor',
            name: 'unsupported-version',
            valid: false,
            value: { ...host, protocolVersion: 2 },
        },
        {
            schema: 'remoteHostDescriptor',
            name: 'endpoint-with-path',
            valid: false,
            value: { ...host, endpoints: [{ ...endpoint, origin: `${endpoint.origin}/api` }] },
        },
        {
            schema: 'remoteHostDescriptor',
            name: 'endpoint-with-userinfo',
            valid: false,
            value: {
                ...host,
                endpoints: [{ ...endpoint, origin: 'http://user:password@192.168.1.20' }],
            },
        },
        { schema: 'remotePairingBootstrap', name: 'bootstrap', valid: true, value: bootstrap },
        {
            schema: 'remotePairingBootstrap',
            name: 'short-challenge',
            valid: false,
            value: { ...bootstrap, challenge: 'short' },
        },
        {
            schema: 'remotePairingBootstrap',
            name: 'invalid-expiry',
            valid: false,
            value: { ...bootstrap, expiresAt: 'tomorrow' },
        },
        { schema: 'remotePairingRequest', name: 'bearer-pairing', valid: true, value: request },
        {
            schema: 'remotePairingRequest',
            name: 'cookie-pairing',
            valid: true,
            value: { ...request, credentialMode: 'cookie' },
        },
        {
            schema: 'remotePairingRequest',
            name: 'unknown-credential-mode',
            valid: false,
            value: { ...request, credentialMode: 'password' },
        },
        {
            schema: 'remotePairingRequest',
            name: 'blank-device-name',
            valid: false,
            value: { ...request, deviceName: '   ' },
        },
        {
            schema: 'remotePairingResponse',
            name: 'paired',
            valid: true,
            value: { status: 'paired', session },
        },
        {
            schema: 'remotePairingResponse',
            name: 'pending',
            valid: true,
            value: {
                status: 'pending',
                pairingId: 'example-pairing',
                expiresAt: bootstrap.expiresAt,
            },
        },
        {
            schema: 'remotePairingResponse',
            name: 'unknown-pairing-state',
            valid: false,
            value: { status: 'accepted', session },
        },
        { schema: 'remoteSessionDescriptor', name: 'session', valid: true, value: session },
        {
            schema: 'remoteSessionDescriptor',
            name: 'cross-app-session',
            valid: false,
            value: { ...session, principal: { ...principal, appId: 'other.app' } },
        },
        {
            schema: 'remoteSessionDescriptor',
            name: 'cross-installation-session',
            valid: false,
            value: { ...session, principal: { ...principal, hostId: 'other-installation' } },
        },
        { schema: 'remoteSavedConnection', name: 'saved-connection', valid: true, value: profile },
        {
            schema: 'remoteSavedConnection',
            name: 'unknown-selected-endpoint',
            valid: false,
            value: { ...profile, selectedEndpointId: 'missing' },
        },
        {
            schema: 'remoteNativeRequest',
            name: 'list-connections',
            valid: true,
            value: { kind: 'connections.list' },
        },
        {
            schema: 'remoteNativeRequest',
            name: 'complete-pairing',
            valid: true,
            value: { kind: 'pairings.complete', bootstrap, deviceName: request.deviceName },
        },
        {
            schema: 'remoteNativeRequest',
            name: 'arbitrary-fetch',
            valid: false,
            value: { kind: 'fetch', url: endpoint.origin },
        },
        {
            schema: 'remoteNativeRequest',
            name: 'extra-privileged-argument',
            valid: false,
            value: { kind: 'connections.list', token: 'forbidden' },
        },
        {
            schema: 'remoteNativeResponse',
            name: 'connection-list',
            valid: true,
            value: { kind: 'connections', connections: [profile] },
        },
        {
            schema: 'remoteNativeResponse',
            name: 'view-response',
            valid: true,
            value: { kind: 'view', view },
        },
        {
            schema: 'remoteNativeResponse',
            name: 'credential-response',
            valid: false,
            value: { kind: 'done', credential: 'forbidden' },
        },
        { schema: 'remoteLocalView', name: 'local-view', valid: true, value: view },
        {
            schema: 'remoteLocalView',
            name: 'view-with-fragment',
            valid: false,
            value: { ...view, origin: `${view.origin}/#credential` },
        },
        {
            schema: 'remoteErrorResponse',
            name: 'safe-error',
            valid: true,
            value: { error: { code: 'unauthorized', message: 'Pair this device first.' } },
        },
        {
            schema: 'remoteErrorResponse',
            name: 'error-with-cause',
            valid: false,
            value: {
                error: { code: 'unauthorized', message: 'Denied', cause: '/private/location' },
            },
        },
    ];
    for (const vector of vectors) {
        if (schemas[vector.schema].safeParse(vector.value).success !== vector.valid)
            throw new Error(`Native protocol vector is stale: ${vector.name}.`);
    }
    for (const vector of remoteRouteMatchVectors) {
        let operationId: string | null = null;
        try {
            operationId = new RemoteRouteRegistry(vector.routes).match(
                vector.method,
                vector.path,
            ).id;
        } catch (error) {
            if (vector.operationId !== null) throw error;
        }
        if (operationId !== vector.operationId)
            throw new Error(`Native route vector is stale: ${vector.name}.`);
    }
    const document = {
        protocolVersion: protocol.remoteProtocolVersion,
        routes: protocol.remoteRoutes,
        schemas: Object.fromEntries(
            Object.entries(schemas).map(([name, schema]) => [
                name,
                z.toJSONSchema(schema, {
                    target: 'draft-2020-12',
                    ...(name === 'remoteContentPolicy' ? { io: 'input' as const } : {}),
                }),
            ]),
        ),
        semanticRules: {
            origins:
                'HTTP(S) origin only; reject credentials, non-root paths, query strings and fragments.',
            sessions: 'host.identity.appId and hostId must equal principal.appId and hostId.',
            savedConnections: 'selectedEndpointId must identify one of the connection endpoints.',
            trimmedStrings:
                'Apply canonical trimming before length validation for deviceName, label and host name.',
            networkScope:
                'Schema acceptance is not network authorization. Native connections separately enforce private-address peer validation and product route registration.',
        },
        vectors,
        routeMatchVectors: remoteRouteMatchVectors,
    };
    const contents = `${JSON.stringify(document, null, 2)}\n`;
    const resources = [
        'libs/remote-capacitor/android/src/main/assets/remote-protocol-v1.json',
        'libs/remote-capacitor/ios/sources/remotecapacitor/resources/remote-protocol-v1.json',
    ];
    for (const relative of resources) {
        const path = join(root, relative);
        if (mode === 'write') {
            await mkdir(dirname(path), { recursive: true });
            await writeFile(path, contents);
        } else {
            const actual = await readFile(path, 'utf8').catch(() => '');
            if (actual !== contents)
                throw new Error(`Native protocol drift: run yarn native:generate (${relative}).`);
        }
    }
    return resources.length;
}
