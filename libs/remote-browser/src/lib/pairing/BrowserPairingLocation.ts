// #region Imports
import {
    remotePairingBootstrapSchema,
    type IRemotePairingBootstrap,
} from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Reads pairing material from a fragment, which the browser never sends in the HTTP request.
 * @remarks Clear only after a durable pairing outcome; retaining a pending attempt permits safe recovery.
 * @public
 */
export class BrowserPairingLocation {
    // #region Ctor
    /**
     * Supply the owning document and history explicitly.
     * @param _location - Current document origin, pathname, search and fragment.
     * @param _history - History replacement port used after durable pairing.
     * @public
     */
    public constructor(
        private readonly _location: Pick<Location, 'origin' | 'pathname' | 'search' | 'hash'>,
        private readonly _history: Pick<History, 'replaceState'>,
    ) {}
    // #endregion
    // #region Methods
    /**
     * Decode and validate one complete invitation fragment.
     * @returns Invitation, or null when no pairing fragment is present.
     * @throws Error for duplicate, missing or malformed pairing fields.
     * @public
     */
    public read(): IRemotePairingBootstrap | null {
        const fields = new URLSearchParams(this._location.hash.replace(/^#/u, ''));
        if (!fields.has('pair')) return null;
        const field = (name: string): string => {
            const values = fields.getAll(name);
            if (values.length !== 1)
                throw new Error('The invitation has missing or duplicate fields.');
            return values[0] ?? '';
        };
        return remotePairingBootstrapSchema.parse({
            appId: field('app'),
            hostId: field('host'),
            origin: this._location.origin,
            challenge: field('pair'),
            expiresAt: field('expires'),
        });
    }
    /**
     * Remove short-lived invitation material without navigating or changing its query.
     * @public
     */
    public clear(): void {
        this._history.replaceState(null, '', `${this._location.pathname}${this._location.search}`);
    }
    // #endregion
}
