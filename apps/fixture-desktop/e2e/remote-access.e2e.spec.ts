// #region Imports
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test, expect } from '@playwright/test';
import { _electron as electron, type ElectronApplication } from 'playwright';
import { createFixtureHost } from '@pixel-brewery/remote-fixture-host';
import { createRemotePairingUrl } from '@pixel-brewery/remote-protocol';
import type { IRemoteControlBridge } from '@pixel-brewery/remote-client';
import { FixtureJourney } from '../../fixture-browser/e2e/FixtureJourney.js';
import { selectFixtureAddress } from '../../fixture-browser/e2e/selectFixtureAddress.js';
// #endregion

const root = resolve(import.meta.dirname, '..');
for (const kind of ['counter', 'notes'] as const) {
    test(`${kind} uses the real OS vault and restores its in-app view after process restart`, async () => {
        // Arrange
        const directory = await mkdtemp(join(tmpdir(), 'remote-desktop-e2e-')),
            output = resolve(root, 'output/playwright');
        await mkdir(output, { recursive: true });
        const address = selectFixtureAddress(),
            loopback = address === '127.0.0.1';
        const host = await createFixtureHost({
            kind,
            host: address,
            allowLoopbackForTests: loopback,
            port: 0,
            storagePath: join(directory, kind + '-host.json'),
            assetsPath: resolve(root, '../fixture-browser/dist'),
        });
        let application: ElectronApplication | undefined;
        const launch = async () => {
            const data = join(directory, kind);
            await mkdir(data, { recursive: true });
            const args = [
                resolve(root, 'dist/main.js'),
                '--e2e',
                ...(loopback ? ['--test-loopback'] : []),
                '--fixture-data=' + data,
                ...(kind === 'notes' ? ['--notes'] : []),
                ...(process.platform === 'linux' ? ['--password-store=gnome-libsecret'] : []),
            ];
            const app = await electron.launch({ args, cwd: root, timeout: 30_000 });
            application = app;
            const storage = await app.evaluate(({ safeStorage, app }) => ({
                mocked: app.commandLine.hasSwitch('use-mock-keychain'),
                available: safeStorage.isEncryptionAvailable(),
                backend: safeStorage.getSelectedStorageBackend?.(),
            }));
            expect(
                storage.mocked,
                'The automation loader must not replace the real Keychain.',
            ).toBe(false);
            expect(storage.available, 'Real OS-backed safeStorage must be available.').toBe(true);
            expect(storage.backend).not.toBe('basic_text');
            return { app, page: await app.firstWindow(), storage };
        };
        try {
            // Act
            const invitation = await host.createPairing();
            let launched = await launch();
            await FixtureJourney.pair(launched.page, createRemotePairingUrl(invitation));
            await FixtureJourney.exercise(launched.page, kind);
            // Assert
            expect(new URL(launched.page.url()).hostname).toBe('127.0.0.1');
            expect(await launched.page.evaluate(() => document.cookie)).toBe('');
            const profiles = await launched.page.evaluate(() =>
                (window as unknown as { remote: IRemoteControlBridge }).remote.listConnections(),
            );
            expect(profiles).toHaveLength(1);
            expect(profiles[0]?.identity.appId).toBe(invitation.appId);
            expect(profiles[0]).not.toHaveProperty('credential');
            await launched.page.screenshot({
                path: join(output, kind + '-in-app.png'),
                fullPage: true,
                animations: 'disabled',
            });
            await application!.close();
            application = undefined;
            launched = await launch();
            await launched.page.getByTestId('connection-open').click();
            await FixtureJourney.ready(launched.page);
            await launched.page.getByTestId('connection-close').click();
            await launched.page.getByTestId('connection-forget').click();
            await launched.page.waitForFunction(
                async () =>
                    (
                        await (
                            window as unknown as { remote: IRemoteControlBridge }
                        ).remote.listConnections()
                    ).length === 0,
            );
            expect(
                await readFile(join(directory, kind, `remote-${kind}`, 'credentials.json'), 'utf8'),
            ).toBe('{}');
            await writeFile(
                join(output, kind + '-desktop-receipt.json'),
                JSON.stringify(
                    {
                        kind,
                        product: invitation.appId,
                        network: loopback ? 'explicit-loopback-test' : 'private-http-lan',
                        inApp: 'passed',
                        osVault: launched.storage,
                        restoreAfterProcessRestart: 'passed',
                        credentialExclusion: 'passed',
                        closeForget: 'passed',
                    },
                    null,
                    2,
                ) + '\n',
            );
        } finally {
            await application?.close();
            await host.dispose();
            await rm(directory, { recursive: true, force: true });
        }
    });
}
