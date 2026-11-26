/**
 * Generated route inventories sharing one canonical, deterministically ordered route set.
 *
 * @remarks
 * Every string ends with a newline. Writing the files, choosing their locations
 * and checking them for drift remain the application's build responsibility.
 *
 * @public
 */
export interface IRemoteNativeRouteSources {
    /**
     * JSON document `{ appId, protocolVersion, routes }` for web clients and gateways.
     *
     * @public
     */
    readonly json: string;
    /**
     * Kotlin source constructing `RemoteNativeConfiguration.Route` values for the Android SDK.
     *
     * @public
     */
    readonly kotlin: string;
    /**
     * Swift source constructing `RemoteNativeConfiguration.Route` values for the iOS SDK.
     *
     * @public
     */
    readonly swift: string;
}
