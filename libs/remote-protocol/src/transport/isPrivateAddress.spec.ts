// #region Imports
import { describe, it, expect } from 'vitest';
import { isPrivateAddress } from './isPrivateAddress.js';
// #endregion
describe('isPrivateAddress', () => {
    it('accepts complete RFC1918 and unique-local numeric addresses', () => {
        // Arrange / Act / Assert
        for (const value of [
            '10.0.0.1',
            '172.16.0.1',
            '172.31.255.255',
            '192.168.1.1',
            'fc00::1',
            '[fd12:3456::1]',
            'fd00:1:2:3:4:5:6:7',
        ])
            expect(isPrivateAddress(value)).toBe(true);
    });
    it('rejects malformed, public, mapped, loopback and scoped addresses', () => {
        // Arrange / Act / Assert
        for (const value of [
            '192.168.1.999',
            '192.168.01.2',
            '127.0.0.1',
            '172.32.0.1',
            '169.254.169.254',
            'example.com',
            'fd00:',
            'fd00:::1',
            'fdzz::1',
            'fd00:1:2:3:4:5:6',
            'fd00:1:2:3:4:5:6:7:8',
            '::ffff:192.168.1.1',
            '::1',
            '[fd00::1',
            'fd00::1%en0',
        ])
            expect(isPrivateAddress(value), value).toBe(false);
    });
});
