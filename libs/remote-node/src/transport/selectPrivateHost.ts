// #region Imports
import { networkInterfaces } from 'node:os';
import { isIP } from 'node:net';
import { isPrivateAddress, RemoteProtocolError } from '@pixel-brewery/remote-protocol';
// #endregion
/**
 * Selects one private physical IPv4 interface deterministically, preferring Wi-Fi/Ethernet.
 *
 * @returns One numeric private IPv4 address from a supported physical interface.
 * @throws RemoteProtocolError when no supported private interface is available.
 * @public
 */
export function selectPrivateHost(): string {
    const candidates = Object.entries(networkInterfaces())
        .flatMap(([name, records]) => {
            if (/docker|veth|tun|vpn|vmnet|bridge|virbr|loopback/iu.test(name)) return [];
            return (records ?? [])
                .filter(
                    (entry) =>
                        !entry.internal &&
                        entry.family === 'IPv4' &&
                        isIP(entry.address) === 4 &&
                        isPrivateAddress(entry.address),
                )
                .map((entry) => ({ name, address: entry.address }));
        })
        .sort((left, right) => {
            const rank = (name: string): number =>
                /^(en|eth|wlan|wifi|wi-fi)/iu.test(name) ? 0 : 1;
            return (
                rank(left.name) - rank(right.name) ||
                left.name.localeCompare(right.name) ||
                left.address.localeCompare(right.address)
            );
        });
    const host = candidates[0]?.address;
    if (!host)
        throw new RemoteProtocolError(
            'not-ready',
            'No supported private local-network interface is available.',
        );
    return host;
}
