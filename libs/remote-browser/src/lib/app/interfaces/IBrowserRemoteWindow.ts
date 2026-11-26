/**
 * Minimal structural view of the document window used by the pre-framework remote gate.
 *
 * @remarks A real `Window` satisfies this contract. Tests and embedding applications may supply an equivalent
 * object. The gate reads these ports only after construction, during preparation, commands and attachment.
 * @public
 */
export interface IBrowserRemoteWindow {
    /**
     * Current document address. The gate reads its origin and fragment, assigns explicit invitation or local-view
     * addresses and reloads a page restored from the back-forward cache after disposal.
     *
     * @public
     */
    readonly location: Pick<
        Location,
        | 'origin'
        | 'protocol'
        | 'hostname'
        | 'port'
        | 'pathname'
        | 'search'
        | 'hash'
        | 'assign'
        | 'reload'
    >;
    /**
     * History replacement port used to remove a consumed invitation fragment without navigating.
     *
     * @public
     */
    readonly history: Pick<History, 'replaceState'>;
    /**
     * Same-origin browser fetch, invoked as a method of this window.
     *
     * @public
     */
    readonly fetch: typeof fetch;
    /**
     * Random source for HTTP-safe operation identifiers; secure-context-only APIs are not required.
     *
     * @public
     */
    readonly crypto: Pick<Crypto, 'getRandomValues'>;
    /**
     * Navigator platform used for the default browser device label.
     *
     * @public
     */
    readonly navigator: Pick<Navigator, 'platform'>;
    /**
     * Optional public pairing-attempt cache. Access may throw when storage is blocked; the gate then keeps its
     * attempt in memory only.
     *
     * @public
     */
    readonly sessionStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
    /**
     * Timer scheduling bound to this window, used for the preparation deadline and session retry clock.
     *
     * @public
     */
    readonly setTimeout: Window['setTimeout'];
    /**
     * Timer cancellation bound to this window.
     *
     * @public
     */
    readonly clearTimeout: Window['clearTimeout'];
    /**
     * Event registration used by attachment for `hashchange`, `pagehide` and `pageshow`.
     *
     * @public
     */
    readonly addEventListener: Window['addEventListener'];
    /**
     * Event removal used by the detach function returned from attachment.
     *
     * @public
     */
    readonly removeEventListener: Window['removeEventListener'];
}
