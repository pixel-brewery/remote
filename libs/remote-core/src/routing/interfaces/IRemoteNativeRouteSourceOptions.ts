/**
 * Application-owned names used to emit route inventories for browser and native clients.
 *
 * @remarks
 * Every name is validated as a plain identifier before it is written into source
 * text, so generated files cannot contain injected declarations.
 *
 * @public
 */
export interface IRemoteNativeRouteSourceOptions {
    /**
     * Application namespace written into the JSON inventory; lowercase letter first, then letters, digits, dots or hyphens, at most 80 characters.
     *
     * @public
     */
    readonly appId: string;
    /**
     * Protocol major version written into the JSON inventory; defaults to the current remote protocol version.
     *
     * @public
     */
    readonly protocolVersion?: number;
    /**
     * Android target declaring a Kotlin `object` with a `routes` list of `RemoteNativeConfiguration.Route` values.
     *
     * @public
     */
    readonly kotlin: {
        /**
         * Dot-separated Kotlin package of the generated file, for example `com.example.product.remote`.
         */
        readonly packageName: string;
        /**
         * Kotlin identifier of the generated internal object.
         */
        readonly objectName: string;
    };
    /**
     * iOS target declaring a Swift `enum` whose throwing `make()` returns `RemoteNativeConfiguration.Route` values.
     *
     * @public
     */
    readonly swift: {
        /**
         * Swift identifier of the generated internal enum.
         */
        readonly typeName: string;
    };
}
