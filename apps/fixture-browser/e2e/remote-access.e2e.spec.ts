// #region Imports
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { test, expect } from '@playwright/test';
import { createFixtureHost } from '@pixel-brewery/remote-fixture-host';
import { createRemotePairingUrl } from '@pixel-brewery/remote-protocol';
import { FixtureJourney } from './FixtureJourney.js';
import { selectFixtureAddress } from './selectFixtureAddress.js';
// #endregion

const root = resolve(import.meta.dirname, '..');
for (const kind of ['counter', 'notes'] as const) {
    test(`${kind} pairs, restores and revokes in an ordinary HTTP browser`, async ({ browser }) => {
        // Arrange
        const directory = await mkdtemp(join(tmpdir(), 'remote-browser-e2e-')),
            output = resolve(root, 'output/playwright');
        await mkdir(output, { recursive: true });
        const address = selectFixtureAddress(),
            loopback = address === '127.0.0.1';
        const host = await createFixtureHost({
            kind,
            host: address,
            allowLoopbackForTests: loopback,
            port: 0,
            storagePath: join(directory, kind + '.json'),
            assetsPath: resolve(root, 'dist'),
        });
        const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
        const page = await context.newPage();
        const failures: string[] = [];
        page.on('pageerror', (error) => failures.push(error.message));
        try {
            // Act
            const bootstrap = await host.createPairing();
            await page.goto(createRemotePairingUrl(bootstrap));
            expect(
                failures,
                'The actual application module must initialize without page errors.',
            ).toEqual([]);
            expect(await page.evaluate(() => isSecureContext)).toBe(loopback);
            try {
                await FixtureJourney.exercise(page, kind);
            } catch (error) {
                const state = await page.evaluate(() => ({
                    status: (
                        document.querySelector('#status') as HTMLElement & { content?: string }
                    )?.content,
                    evidence: document.querySelector('#evidence')?.textContent,
                    body: document.body.innerText.slice(0, 500),
                }));
                throw new Error(JSON.stringify({ state, failures }), { cause: error });
            }
            // Assert
            expect(await page.evaluate(() => location.hash)).toBe('');
            expect(await page.evaluate(() => document.cookie)).toBe('');
            expect(failures).toEqual([]);
            await page.screenshot({
                path: join(output, kind + '-dark-mobile.png'),
                fullPage: true,
                animations: 'disabled',
            });
            await page.reload();
            await FixtureJourney.ready(page);
            await page.getByTestId('revoke').click();
            await page.waitForFunction(
                () =>
                    (document.querySelector('#status') as HTMLElement & { content?: string })
                        ?.content === 'Connection: revoked',
            );
            await writeFile(
                join(output, kind + '-browser-receipt.json'),
                JSON.stringify(
                    {
                        kind,
                        product: bootstrap.appId,
                        pairing: 'fragment-cookie',
                        restore: 'passed',
                        requests: 'passed',
                        streams:
                            kind === 'counter'
                                ? ['sse', 'websocket', 'media-range', 'native-formdata']
                                : [],
                        revocation: 'passed',
                        viewport: [390, 844],
                        mode: 'dark',
                        pageErrors: failures.length,
                    },
                    null,
                    2,
                ) + '\n',
            );
        } finally {
            await context.close();
            await host.dispose();
            await rm(directory, { recursive: true, force: true });
        }
    });
}
