/**
 * Application-supplied server identity, confined to the privileged Node runtime.
 *
 * @public
 */
export interface IRemoteTlsMaterial {
    /**
     * Application-supplied private server key. Keep this value confined to the privileged runtime.
     *
     * @public
     */
    readonly key: string | Buffer;
    /**
     * Application-supplied PEM certificate or certificate chain.
     *
     * @public
     */
    readonly cert: string | Buffer;
    /**
     * Optional PEM issuer chain consumed by the TLS implementation.
     *
     * @public
     */
    readonly ca?: string | Buffer | readonly (string | Buffer)[];
    /**
     * Optional private-key decryption passphrase supplied by the application.
     *
     * @public
     */
    readonly passphrase?: string;
}
