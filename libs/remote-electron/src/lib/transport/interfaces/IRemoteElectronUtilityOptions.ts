// #region Imports
import type { IRemoteCredentialStore, IRemoteProfileStore } from '@pixel-brewery/remote-client';
import type { IRemoteContentPolicy, IRemoteRouteDefinition } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Privileged Utility Process composition; no value is accepted from renderer configuration.
 * @public
 */
export interface IRemoteElectronUtilityOptions {
    /**
     * Immutable product namespace.
     * @public
     */
    readonly appId: string;
    /**
     * Immutable packaged UI directory.
     * @public
     */
    readonly assetsPath: string;
    /**
     * Explicit product operation registry.
     * @public
     */
    readonly routes: readonly IRemoteRouteDefinition[];
    /**
     * App-owned HTTPS resource permissions for trusted packaged UI; every flag defaults to false.
     * @remarks This never expands remote proxy routes, scripts, frames or navigation.
     * @public
     */
    readonly contentPolicy?: IRemoteContentPolicy;
    /**
     * App-owned safe profile store.
     * @public
     */
    readonly profileStore: IRemoteProfileStore;
    /**
     * Narrow Main-mediated credential vault port.
     * @public
     */
    readonly credentialStore: IRemoteCredentialStore;
    /**
     * Test-only explicit loopback upstream acceptance.
     * @public
     */
    readonly allowLoopbackForTests?: boolean;
}
