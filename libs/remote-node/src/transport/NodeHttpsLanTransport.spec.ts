// #region Imports
import { afterEach, describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RemoteAccessService } from '@pixel-brewery/remote-core';
import { NodeRemoteSecurity } from '../security/NodeRemoteSecurity.js';
import { NodeRemoteHost } from '../host/NodeRemoteHost.js';
import { NodeRemoteConnector } from '../client/NodeRemoteConnector.js';
import { NodeHttpsLanTransport } from './NodeHttpsLanTransport.js';
// #endregion

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => {
    for (const dispose of cleanup.splice(0).reverse()) await dispose();
});

describe('NodeHttpsLanTransport', () => {
    it('uses app-supplied TLS identity and trust, retaining the last good context if renewal fails', async () => {
        // Arrange
        const root = await mkdtemp(join(tmpdir(), 'remote-tls-'));
        cleanup.push(() => rm(root, { recursive: true, force: true }));
        const keyPath = join(root, 'private.pem');
        const certificatePath = join(root, 'certificate.pem');
        execFileSync(
            'openssl',
            [
                'req',
                '-x509',
                '-newkey',
                'rsa:2048',
                '-nodes',
                '-days',
                '1',
                '-subj',
                '/CN=Remote TLS test',
                '-addext',
                'subjectAltName=IP:127.0.0.1',
                '-keyout',
                keyPath,
                '-out',
                certificatePath,
            ],
            { stdio: 'ignore' },
        );
        const key = await readFile(keyPath);
        const cert = await readFile(certificatePath);
        const unsubscribe = vi.fn();
        let renewal!: () => void;
        let invalidRenewal = false;
        let renewalReported!: () => void;
        const failedRenewal = new Promise<void>((complete) => {
            renewalReported = complete;
        });
        let state: unknown = null;
        const identity = { appId: 'test.tls', hostId: 'host-one' };
        const access = new RemoteAccessService({
            identity,
            capabilities: [],
            store: {
                load: async () => state,
                save: async (value) => {
                    state = value;
                },
            },
            clock: { now: () => Date.now() },
            security: new NodeRemoteSecurity(),
        });
        const host = new NodeRemoteHost({
            identity,
            access,
            name: 'TLS fixture',
            routes: [],
            application: {
                handle: async (_request, response) => {
                    response.end();
                },
            },
            host: '127.0.0.1',
            port: 0,
            allowLoopbackForTests: true,
            transports: [
                new NodeHttpsLanTransport({
                    getMaterial: async () => ({
                        key,
                        cert: invalidRenewal ? 'invalid renewal material' : cert,
                    }),
                    subscribe: (listener) => {
                        renewal = listener;
                        return unsubscribe;
                    },
                }),
            ],
            reportFailure: (failure) => {
                if (failure.operation === 'tls-renewal') renewalReported();
            },
        });
        cleanup.push(() => host.dispose());
        await host.enable();
        const store = {
            get: vi.fn(async () => null),
            set: async () => undefined,
            delete: async () => undefined,
        };
        const options = {
            expectedIdentity: identity,
            routes: [],
            credentialStore: store,
            allowLoopbackForTests: true,
            transportId: 'lan-https' as const,
        };
        // Act
        await expect(
            new NodeRemoteConnector(options).connect(
                host.descriptor.endpoints[0]!,
                new AbortController().signal,
            ),
        ).rejects.toMatchObject({ code: 'network' });
        const trusted = await new NodeRemoteConnector({
            ...options,
            certificateAuthority: cert,
        }).connect(host.descriptor.endpoints[0]!, new AbortController().signal);
        cleanup.push(() => trusted.dispose());
        invalidRenewal = true;
        renewal();
        await failedRenewal;
        const retained = await new NodeRemoteConnector({
            ...options,
            certificateAuthority: cert,
        }).connect(host.descriptor.endpoints[0]!, new AbortController().signal);
        cleanup.push(() => retained.dispose());
        await host.dispose();
        // Assert
        expect(unsubscribe).toHaveBeenCalledTimes(1);
        expect(store.get).not.toHaveBeenCalled();
        expect(host.status().state).toBe('disposed');
    });
});
