// #region Imports
import { RemoteAccessService } from '@pixel-brewery/remote-core';
import { NodeRemoteHost } from '@pixel-brewery/remote-node/host';
import { JsonRemoteAccessStore } from '@pixel-brewery/remote-node/persistence';
import { NodeRemoteSecurity } from '@pixel-brewery/remote-node/security';
import { FixtureCounterAdapter } from '../counter/FixtureCounterAdapter.js';
import { fixtureCounterRoutes } from '../counter/fixtureCounterRoutes.js';
import { FixtureNotesAdapter } from '../notes/FixtureNotesAdapter.js';
import { fixtureNotesRoutes } from '../notes/fixtureNotesRoutes.js';
import type { IFixtureHostOptions } from './interfaces/IFixtureHostOptions.js';
// #endregion

/**
 * Starts one real Remote host around an application-owned counter or notes graph.
 *
 * @param options - Product selection, installation identity, persistence location and explicit interface policy.
 * @returns The available owned host. Call createPairing for out-of-band material and dispose when the journey ends.
 * @throws A typed authorization, configuration or network error when startup cannot complete.
 * @public
 */
export async function createFixtureHost(options: IFixtureHostOptions): Promise<NodeRemoteHost> {
    const identity = {
        appId: 'remote.fixture.' + options.kind,
        hostId: options.hostId ?? 'fixture-installation',
    };
    const routes = options.kind === 'counter' ? fixtureCounterRoutes : fixtureNotesRoutes;
    const application =
        options.kind === 'counter' ? new FixtureCounterAdapter() : new FixtureNotesAdapter();
    const access = new RemoteAccessService({
        identity,
        store: new JsonRemoteAccessStore(options.storagePath),
        security: new NodeRemoteSecurity(),
        clock: { now: () => Date.now() },
        capabilities: [...new Set(routes.flatMap((route) => route.capabilities))],
    });
    const host = new NodeRemoteHost({
        identity,
        name: options.kind === 'counter' ? 'Remote Counter Fixture' : 'Remote Notes Fixture',
        access,
        routes,
        application,
        contentSecurityPolicy:
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; media-src 'self' blob:; connect-src 'self' ws: wss:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'",
        ...(options.assetsPath !== undefined ? { assetsPath: options.assetsPath } : {}),
        ...(options.host !== undefined ? { host: options.host } : {}),
        ...(options.port !== undefined ? { port: options.port } : {}),
        ...(options.allowLoopbackForTests !== undefined
            ? { allowLoopbackForTests: options.allowLoopbackForTests }
            : {}),
    });
    try {
        await host.enable();
        return host;
    } catch (cause) {
        await host.dispose();
        throw cause;
    }
}
