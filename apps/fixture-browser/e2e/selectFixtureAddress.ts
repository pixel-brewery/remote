// #region Imports
import { networkInterfaces } from 'node:os';
import { isPrivateAddress } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Select a private IPv4 interface or the explicitly requested local test boundary.
 *
 * @remarks REMOTE_FIXTURE_ALLOW_LOOPBACK=1 is a separate local test mode; its receipt cannot establish LAN acceptance.
 * @returns A numeric RFC1918 address, or loopback only with the explicit test environment setting.
 * @throws When the runner has no private IPv4 interface; loopback cannot prove this boundary.
 * @public
 */
export function selectFixtureAddress(): string {
    if (process.env['REMOTE_FIXTURE_ALLOW_LOOPBACK'] === '1') return '127.0.0.1';
    for (const addresses of Object.values(networkInterfaces())) {
        for (const address of addresses ?? []) {
            if (!address.internal && address.family === 'IPv4' && isPrivateAddress(address.address))
                return address.address;
        }
    }
    throw new Error('LAN acceptance requires an active private IPv4 network interface.');
}
