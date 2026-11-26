// #region Imports
import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NodeRemoteHost } from '@pixel-brewery/remote-node/host';
import { remoteRoutes } from '@pixel-brewery/remote-protocol';
import { createFixtureHost } from './createFixtureHost.js';
// #endregion

const hosts: NodeRemoteHost[] = [];
const roots: string[] = [];
afterEach(async () => {
    for (const host of hosts.splice(0)) await host.dispose();
    for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

async function pair(host: NodeRemoteHost): Promise<string> {
    const invitation = await host.createPairing();
    const response = await fetch(invitation.origin + remoteRoutes.pairings, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            challenge: invitation.challenge,
            attemptId: 'fixture-attempt-12345678',
            deviceName: 'Fixture browser',
            credentialMode: 'bearer',
        }),
    });
    const paired = (await response.json()) as { credential: string };
    return paired.credential;
}

describe('createFixtureHost', () => {
    it('serves the application-owned Mosaik asset policy while permitting scripts only from the packaged origin', async () => {
        // Arrange
        const root = await mkdtemp(join(tmpdir(), 'remote-fixture-policy-'));
        roots.push(root);
        const assetsPath = join(root, 'assets');
        await mkdir(assetsPath);
        await writeFile(
            join(assetsPath, 'index.html'),
            '<!doctype html><style>body { display: block; }</style><script src="/app.js"></script>',
        );
        await writeFile(join(assetsPath, 'app.js'), 'globalThis.packagedFixture = true;');
        const host = await createFixtureHost({
            kind: 'counter',
            storagePath: join(root, 'access.json'),
            assetsPath,
            host: '127.0.0.1',
            port: 0,
            allowLoopbackForTests: true,
        });
        hosts.push(host);
        // Act
        const origin = host.descriptor.endpoints[0]!.origin;
        const page = await fetch(origin + '/');
        const script = await fetch(origin + '/app.js');
        const policy = page.headers
            .get('content-security-policy')!
            .split(';')
            .map((part) => part.trim());
        // Assert
        expect(page.status).toBe(200);
        expect(policy).toContain("style-src 'self' 'unsafe-inline'");
        expect(policy).toContain("script-src 'self'");
        expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
        expect(script.headers.get('content-type')).toContain('javascript');
        expect(await script.text()).toBe('globalThis.packagedFixture = true;');
        await page.arrayBuffer();
    });

    it('runs unrelated notes and counter graphs through the same SDK while isolating their credentials and operations', async () => {
        // Arrange
        const root = await mkdtemp(join(tmpdir(), 'remote-fixtures-'));
        roots.push(root);
        const counter = await createFixtureHost({
            kind: 'counter',
            storagePath: join(root, 'counter.json'),
            host: '127.0.0.1',
            port: 0,
            allowLoopbackForTests: true,
        });
        hosts.push(counter);
        const notes = await createFixtureHost({
            kind: 'notes',
            storagePath: join(root, 'notes.json'),
            host: '127.0.0.1',
            port: 0,
            allowLoopbackForTests: true,
        });
        hosts.push(notes);
        const counterToken = await pair(counter);
        const notesToken = await pair(notes);
        const counterOrigin = counter.descriptor.endpoints[0]!.origin;
        const notesOrigin = notes.descriptor.endpoints[0]!.origin;
        // Act
        const increment = await fetch(counterOrigin + '/api/counter', {
            method: 'POST',
            headers: {
                authorization: 'Bearer ' + counterToken,
                'content-type': 'application/json',
            },
            body: '{"delta":3}',
        });
        const note = await fetch(notesOrigin + '/api/notes', {
            method: 'POST',
            headers: { authorization: 'Bearer ' + notesToken, 'content-type': 'application/json' },
            body: '{"text":"Independent product data"}',
        });
        const crossHost = await fetch(notesOrigin + '/api/notes', {
            headers: { authorization: 'Bearer ' + counterToken },
        });
        const wrongOperation = await fetch(counterOrigin + '/api/notes', {
            headers: { authorization: 'Bearer ' + counterToken },
        });
        const form = new FormData();
        form.append('file', new Blob([new Uint8Array([0, 255, 128])]), 'fixture.bin');
        const upload = await fetch(counterOrigin + '/api/upload', {
            method: 'POST',
            headers: { authorization: 'Bearer ' + counterToken },
            body: form,
        });
        const uploaded = (await upload.json()) as { bytes: number; contentType: string };
        // Assert
        expect(await increment.json()).toEqual({ value: 3 });
        expect(note.status).toBe(201);
        expect(await note.json()).toMatchObject({ text: 'Independent product data' });
        expect(crossHost.status).toBe(401);
        expect(wrongOperation.status).toBe(403);
        expect(counter.descriptor.identity.appId).toBe('remote.fixture.counter');
        expect(notes.descriptor.identity.appId).toBe('remote.fixture.notes');
        expect(upload.status).toBe(200);
        expect(uploaded.bytes).toBeGreaterThan(3);
        expect(uploaded.contentType).toMatch(/^multipart\/form-data; boundary=/u);
    });
});
