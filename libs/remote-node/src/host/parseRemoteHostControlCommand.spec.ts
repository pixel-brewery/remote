// #region Imports
import { describe, expect, it } from 'vitest';
import { parseRemoteHostControlCommand } from './parseRemoteHostControlCommand.js';
// #endregion

describe('parseRemoteHostControlCommand', () => {
    it('accepts exactly the closed command shapes', () => {
        // Arrange / Act / Assert
        expect(parseRemoteHostControlCommand('/enable', {})).toEqual({ kind: 'enable' });
        expect(parseRemoteHostControlCommand('/disable', {})).toEqual({ kind: 'disable' });
        expect(parseRemoteHostControlCommand('/reconcile', {})).toEqual({ kind: 'reconcile' });
        expect(parseRemoteHostControlCommand('/pair', {})).toEqual({ kind: 'pair' });
        expect(parseRemoteHostControlCommand('/pair', { endpointId: 'https-lan:2' })).toEqual({
            kind: 'pair',
            endpointId: 'https-lan:2',
        });
        expect(parseRemoteHostControlCommand('/revoke', { deviceId: 'Ab_9-x' })).toEqual({
            kind: 'revoke',
            deviceId: 'Ab_9-x',
        });
    });

    it('rejects unknown fields, foreign paths, non-objects and malformed identifiers', () => {
        // Arrange
        const samples: ReadonlyArray<readonly [string, unknown]> = [
            ['/enable', { enabled: true }],
            ['/enable', []],
            ['/enable', null],
            ['/disable', 'disable'],
            ['/status', {}],
            ['/command', {}],
            ['/pair', { endpointId: '' }],
            ['/pair', { endpointId: 'a/b' }],
            ['/pair', { endpointId: 'x'.repeat(161) }],
            ['/pair', { endpointId: 'lan', deviceId: 'device' }],
            ['/revoke', {}],
            ['/revoke', { deviceId: 7 }],
            ['/revoke', { deviceId: 'device.one' }],
            ['/revoke', JSON.parse('{"__proto__":{"deviceId":"x"}}') as unknown],
        ];
        // Act / Assert
        for (const [path, body] of samples)
            expect(() => parseRemoteHostControlCommand(path, body)).toThrow(
                expect.objectContaining({
                    code: 'invalid-request',
                    message: 'The private remote-control request is invalid.',
                }),
            );
    });
});
