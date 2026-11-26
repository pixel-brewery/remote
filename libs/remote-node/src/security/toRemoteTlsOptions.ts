// #region Imports
import type { SecureContextOptions } from 'node:tls';
import type { IRemoteTlsMaterial } from './interfaces/IRemoteTlsMaterial.js';
// #endregion

/**
 * Maps the narrow application certificate port to Node's TLS material representation.
 *
 * @param material - Protected application-supplied key, certificate and optional issuer chain.
 * @returns TLS options retaining certificate verification and without creating or issuing material.
 * @internal
 */
export function toRemoteTlsOptions(material: IRemoteTlsMaterial): SecureContextOptions {
    const ca = material.ca;
    return {
        key: material.key,
        cert: material.cert,
        ...(ca !== undefined
            ? { ca: typeof ca === 'string' || Buffer.isBuffer(ca) ? ca : [...ca] }
            : {}),
        ...(material.passphrase !== undefined ? { passphrase: material.passphrase } : {}),
    };
}
