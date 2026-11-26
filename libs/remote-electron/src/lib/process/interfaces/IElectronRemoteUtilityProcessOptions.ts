// #region Imports
import type { IRemoteProfileStore } from '@pixel-brewery/remote-client';
import type { IRemoteContentPolicy, IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Application composition of the network-owning Utility Process started by `startElectronRemoteUtility`.
 *
 * @remarks These values are compiled into the application's own Utility entry. Main supplies only
 * the absolute asset and storage paths at initialization; no value comes from renderer code.
 * @public
 */
export interface IElectronRemoteUtilityProcessOptions {
    /**
     * Canonical lowercase application namespace. Initialization fails when Main announces another one.
     *
     * @public
     */
    readonly appId: string;
    /**
     * Load the application's registered operation inventory once during initialization.
     *
     * @param assetsPath - Absolute packaged UI directory announced by Main, for inventories generated
     * next to the packaged assets.
     * @returns Routes the gateway and upstream transport admit; the canonical route registry validates
     * them before any connection opens.
     * @throws Any error to fail initialization; Main then stops the Utility Process.
     * @public
     */
    loadRoutes(assetsPath: string): Promise<readonly IRemoteRouteDefinition[]>;
    /**
     * App-owned HTTPS resource permissions of the packaged UI; every flag defaults to false.
     *
     * @remarks This never adds remote proxy routes, scripts, frames or navigation.
     * @public
     */
    readonly contentPolicy?: IRemoteContentPolicy;
    /**
     * Create the safe profile store below the storage directory announced by Main.
     *
     * @param storageDirectory - Absolute application-private directory.
     * @returns Store of credential-free profiles. Defaults to a `JsonRemoteProfileStore` at
     * `profiles.json` in that directory.
     * @public
     */
    createProfileStore?(storageDirectory: string): IRemoteProfileStore;
    /**
     * Milliseconds one credential request may wait for Main's OS vault. Defaults to 15000.
     *
     * @public
     */
    readonly credentialTimeoutMs?: number;
}
