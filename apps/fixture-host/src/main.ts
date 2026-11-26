// #region Imports
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createRemotePairingUrl } from '@pixel-brewery/remote-protocol';
import { createFixtureHost } from './host/createFixtureHost.js';
// #endregion

const kind = process.env['REMOTE_FIXTURE_KIND'] ?? 'counter';
if (kind !== 'counter' && kind !== 'notes')
    throw new Error('REMOTE_FIXTURE_KIND must be counter or notes.');
const invitationPath = process.env['REMOTE_FIXTURE_INVITATION'];
if (!invitationPath)
    throw new Error(
        'REMOTE_FIXTURE_INVITATION must name a private invitation output file outside the repository.',
    );
const storagePath = process.env['REMOTE_FIXTURE_STORAGE'];
if (!storagePath)
    throw new Error(
        'REMOTE_FIXTURE_STORAGE must name the application-owned private authorization file.',
    );
const host = await createFixtureHost({
    kind,
    storagePath: resolve(storagePath),
    ...(process.env['REMOTE_FIXTURE_HOST'] ? { host: process.env['REMOTE_FIXTURE_HOST'] } : {}),
    ...(process.env['REMOTE_FIXTURE_PORT']
        ? { port: Number(process.env['REMOTE_FIXTURE_PORT']) }
        : {}),
    ...(process.env['REMOTE_FIXTURE_ASSETS']
        ? { assetsPath: resolve(process.env['REMOTE_FIXTURE_ASSETS']) }
        : {}),
});
const bootstrap = await host.createPairing();
await writeFile(
    resolve(invitationPath),
    JSON.stringify({ bootstrap, url: createRemotePairingUrl(bootstrap) }) + '\n',
    { mode: 0o600, flag: 'wx' },
);
console.log(JSON.stringify(host.descriptor));
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const)
    process.on(signal, () => {
        if (stopping) return;
        stopping = true;
        void host.dispose().then(() => {
            process.exitCode = 0;
        });
    });
