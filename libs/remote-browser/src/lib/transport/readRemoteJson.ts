// #region Imports
import type { IRemoteByteResponse } from '@pixel-brewery/remote-protocol';
import { decodeBoundedJson } from './decodeBoundedJson.js';
// #endregion

/**
 * Read one bounded JSON product response obtained through an authorized remote session.
 *
 * @remarks Intended for small metadata reads such as an application's capability declaration. The response is
 * always consumed or cancelled, also after a failure. The result is untrusted until the application validates it.
 * @example
 * ```ts
 * const response = await session.request({ method: 'GET', path: '/api/capabilities', signal });
 * const metadata = capabilitiesSchema.parse(await readRemoteJson(response));
 * ```
 * @param response - Remote byte response whose body this function takes ownership of.
 * @param maximumBytes - Positive inclusive byte bound for the JSON document; defaults to 65536.
 * @returns The parsed JSON value before application schema validation.
 * @throws RangeError for an invalid bound or an oversized document.
 * @throws Error for a non-2xx status; TypeError or SyntaxError for invalid UTF-8 or JSON.
 * @public
 */
export async function readRemoteJson(
    response: IRemoteByteResponse,
    maximumBytes = 65_536,
): Promise<unknown> {
    try {
        if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1)
            throw new RangeError('The JSON byte bound must be a positive safe integer.');
        if (response.status < 200 || response.status > 299)
            throw new Error(`The remote read failed with status ${response.status}.`);
        return await decodeBoundedJson(response.body, maximumBytes);
    } finally {
        await response.cancel().catch(() => undefined);
    }
}
