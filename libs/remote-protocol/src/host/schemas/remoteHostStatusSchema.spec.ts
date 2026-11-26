// #region Imports
import { describe, expect, it } from 'vitest';
import { remoteHostStatusSchema } from './remoteHostStatusSchema.js';
// #endregion

const identity = { appId: 'example', hostId: 'installation-1' };
const origin = 'http://192.168.10.20:4321';
const device = {
    id: 'device-1',
    name: 'Phone',
    capabilities: ['example:read'],
    pairedAt: '2026-11-26T10:00:00.000Z',
};
const status = (overrides: object = {}) => ({
    state: 'available',
    host: {
        identity,
        name: 'Host',
        protocolVersion: 1,
        endpoints: [{ id: 'lan', transportId: 'lan-http', origin }],
    },
    access: {
        enabled: true,
        devices: [device],
        pendingPairings: [
            { id: 'pairing-1', deviceName: 'Tablet', expiresAt: '2026-11-26T10:05:00.000Z' },
        ],
    },
    ...overrides,
});

describe('remoteHostStatusSchema', () => {
    it('accepts the complete host projection including optional diagnostics and last use', () => {
        // Arrange
        const input = status({
            state: 'unavailable',
            errorCode: 'network',
            access: {
                enabled: true,
                devices: [{ ...device, lastSeenAt: '2026-11-26T11:00:00.000Z' }],
                pendingPairings: [],
            },
        });
        // Act
        const result = remoteHostStatusSchema.parse(input);
        // Assert
        expect(result).toEqual(input);
        expect(Object.isFrozen(result)).toBe(true);
        expect(Object.isFrozen(result.access.devices[0])).toBe(true);
    });
    it('rejects secret-bearing or unknown fields at every level', () => {
        // Arrange
        const candidates = [
            status({ credential: 'must-not-enter-state' }),
            status({
                access: {
                    enabled: true,
                    devices: [{ ...device, tokenHash: 'x'.repeat(64) }],
                    pendingPairings: [],
                },
            }),
            status({
                access: {
                    enabled: true,
                    devices: [],
                    pendingPairings: [
                        {
                            id: 'pairing-1',
                            deviceName: 'Tablet',
                            expiresAt: '2026-11-26T10:05:00.000Z',
                            challenge: 'a'.repeat(43),
                        },
                    ],
                },
            }),
            status({ access: { enabled: true, devices: [], pendingPairings: [], secret: 'x' } }),
        ];
        // Act
        const results = candidates.map((candidate) => remoteHostStatusSchema.safeParse(candidate));
        // Assert
        expect(results.map((result) => result.success)).toEqual([false, false, false, false]);
    });
    it('rejects unknown lifecycle states, malformed instants and unbounded collections', () => {
        // Arrange
        const unknownState = status({ state: 'listening' });
        const malformedInstant = status({
            access: {
                enabled: true,
                devices: [{ ...device, pairedAt: 'yesterday' }],
                pendingPairings: [],
            },
        });
        const tooManyDevices = status({
            access: {
                enabled: true,
                devices: Array.from({ length: 101 }, (_, index) => ({
                    ...device,
                    id: `device-${index}`,
                })),
                pendingPairings: [],
            },
        });
        // Act
        const results = [unknownState, malformedInstant, tooManyDevices].map(
            (candidate) => remoteHostStatusSchema.safeParse(candidate).success,
        );
        // Assert
        expect(results).toEqual([false, false, false]);
    });
});
