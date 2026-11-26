// #region Imports
import type {
    IRemoteHostDescriptor,
    IRemoteContentPolicy,
    IRemotePairingBootstrap,
    IRemoteSessionDescriptor,
} from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Public wire examples and boundary rejection cases for independent adapter implementations.
 *
 * @public
 */
export interface IRemoteContractVectors {
    /**
     * Credential-free descriptor for the fixed notes fixture installation.
     *
     * @public
     */
    readonly host: IRemoteHostDescriptor;
    /**
     * Fixed expired example invitation. Its challenge is fake test data.
     *
     * @public
     */
    readonly bootstrap: IRemotePairingBootstrap;
    /**
     * Authorized device projection belonging to the same fixture installation.
     *
     * @public
     */
    readonly session: IRemoteSessionDescriptor;
    /**
     * Destinations production private-LAN connectors must reject.
     *
     * @public
     */
    readonly invalidOrigins: readonly string[];
    /**
     * Ambiguous or foreign request targets every route boundary must reject.
     *
     * @public
     */
    readonly invalidPaths: readonly string[];
    /**
     * Valid independently selectable HTTPS content permissions, including the deny-by-default empty input.
     *
     * @public
     */
    readonly contentPolicies: readonly IRemoteContentPolicy[];
    /**
     * Invalid content policies that attempt script permission or use non-boolean flags.
     *
     * @public
     */
    readonly invalidContentPolicies: readonly unknown[];
}
