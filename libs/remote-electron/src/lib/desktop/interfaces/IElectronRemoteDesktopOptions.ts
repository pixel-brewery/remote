/**
 * Application-owned composition of the generic Electron Main remote owner.
 *
 * @remarks Main supplies these values after app readiness from its own trusted configuration;
 * renderer controls can never replace them. The application keeps its window, navigation policy,
 * route inventory and storage locations; the SDK owns process, credential and view orchestration.
 * @public
 */
export interface IElectronRemoteDesktopOptions {
    /**
     * Canonical lowercase application namespace. Pairings, profiles, credentials and activations of
     * any other namespace are rejected.
     *
     * @public
     */
    readonly appId: string;
    /**
     * Fixed IPC channel the application's preload invokes. Exactly one handler is registered on it
     * and removed again by dispose.
     *
     * @public
     */
    readonly channel: string;
    /**
     * Absolute path of the bundled Utility Process entry that calls `startElectronRemoteUtility`.
     *
     * @public
     */
    readonly utilityPath: string;
    /**
     * Absolute immutable packaged UI directory served by the protected loopback gateway.
     *
     * @public
     */
    readonly assetsPath: string;
    /**
     * Absolute application-private directory. Main keeps the OS-encrypted `credentials.json` here;
     * the Utility Process keeps its safe profile metadata in the same directory.
     *
     * @public
     */
    readonly storageDirectory: string;
    /**
     * Origins that are never accepted as a gateway view, for example an embedded local backend
     * that also listens on `127.0.0.1`. The attached local renderer is always forbidden as well.
     * Defaults to an empty list.
     *
     * @public
     */
    readonly forbiddenOrigins?: readonly string[];
    /**
     * Called with the selected gateway origin once its cookie is installed and before Main opens it,
     * and with undefined when the window returns to the local renderer or the owner closes. The
     * application uses it to widen or narrow its own navigation and window controls.
     *
     * @public
     */
    readonly onRemoteRenderer?: (origin: string | undefined) => void;
    /**
     * Receives Utility Process output in chunks of at most 8192 characters. Without a logger the
     * Utility inherits Main's standard streams.
     *
     * @public
     */
    readonly logger?: (stream: 'stdout' | 'stderr', text: string) => void;
    /**
     * Operating-system service name of the network Utility Process. Defaults to `Remote network`.
     *
     * @public
     */
    readonly serviceName?: string;
    /**
     * Test-only acceptance of loopback upstream peers, forwarded to the Utility runtime.
     * Defaults to false; never enable it in a production build.
     *
     * @public
     */
    readonly allowLoopbackForTests?: boolean;
    /**
     * Milliseconds the Utility Process may take from fork to `initialized`. Defaults to 15000.
     *
     * @public
     */
    readonly initializationTimeoutMs?: number;
    /**
     * Milliseconds one control operation may take in the Utility Process. Defaults to 30000; an
     * expired write has an unknown outcome and must be reconciled before it is retried.
     *
     * @public
     */
    readonly operationTimeoutMs?: number;
    /**
     * Milliseconds dispose waits for the Utility's `disposed` signal or exit before it kills the
     * process. Defaults to 2000.
     *
     * @public
     */
    readonly disposeTimeoutMs?: number;
}
