// #region Imports
import { createServer, type Server as HttpsServer } from 'node:https';
import type { RequestListener, Server } from 'node:http';
import type { IRemoteNodeTransport } from './interfaces/IRemoteNodeTransport.js';
import type { IRemoteTlsProvider } from '../security/interfaces/IRemoteTlsProvider.js';
import { toRemoteTlsOptions } from '../security/toRemoteTlsOptions.js';
// #endregion
/**
 * TLS listener consuming an application-owned certificate provider.
 *
 * @public
 */
export class NodeHttpsLanTransport implements IRemoteNodeTransport {
    // #region Ctor
    /**
     * Binds issuance-independent TLS material.
     *
     * @param _provider - Application-owned certificate material and renewal port.
     * @public
     */
    public constructor(private readonly _provider: IRemoteTlsProvider) {}
    // #endregion
    // #region Properties
    /**
     * Stable connector identifier.
     *
     * @public
     */
    public readonly id = 'lan-https';
    /**
     * Listener protocol.
     *
     * @public
     */
    public readonly scheme = 'https' as const;
    // #endregion
    // #region Methods
    /**
     * Creates an unbound TLS server and activates renewed material in place.
     *
     * @param listener - Original HTTP request dispatcher supplied by the owning host.
     * @returns The unbound server. The caller must bind and close it through its owning lifecycle.
     * @public
     */
    public async create(listener: RequestListener): Promise<Server> {
        const material = await this._provider.getMaterial();
        const server: HttpsServer = createServer(toRemoteTlsOptions(material), listener);
        let closed = false;
        let revision = 0;
        const unsubscribe = this._provider.subscribe?.(() => {
            const current = ++revision;
            void this._provider
                .getMaterial()
                .then((next) => {
                    if (!closed && current === revision)
                        server.setSecureContext(toRemoteTlsOptions(next));
                })
                .catch(() => {
                    if (!closed && current === revision) server.emit('tlsRenewalError');
                });
        });
        server.once('close', () => {
            closed = true;
            unsubscribe?.();
        });
        return server;
    }
    // #endregion
}
