// #region Imports
import { RemoteProtocolError } from '../errors/RemoteProtocolError.js';
// #endregion
/**
 * Validates an origin-form path without resolving ambiguous path segments.
 *
 * @param input - Original request path, optionally followed by a query.
 * @returns A decoded pathname whose segments were validated exactly once.
 * @throws RemoteProtocolError when normalization could change routing authority.
 * @public
 */
export function normalizeRemotePath(input: string): string {
    const path = input.split('?')[0] ?? '';
    if (
        input.length > 16384 ||
        input.includes('#') ||
        /[\u0000-\u0020\u007f]/u.test(input) ||
        !path.startsWith('/') ||
        path.startsWith('//') ||
        path.includes('\\') ||
        /%2f|%5c/iu.test(path) ||
        /[\u0000-\u0020\u007f]/u.test(path)
    ) {
        throw new RemoteProtocolError('invalid-request', 'The request path is invalid.');
    }
    let decoded: string;
    try {
        decoded = decodeURIComponent(path);
    } catch {
        throw new RemoteProtocolError('invalid-request', 'The request path encoding is invalid.');
    }
    if (
        /[\u0000-\u0020\u007f]/u.test(decoded) ||
        /[%?#]/u.test(decoded) ||
        decoded.includes('\\') ||
        decoded.includes('//') ||
        decoded.split('/').some((part) => part === '.' || part === '..')
    ) {
        throw new RemoteProtocolError('invalid-request', 'The request path is ambiguous.');
    }
    return decoded;
}
