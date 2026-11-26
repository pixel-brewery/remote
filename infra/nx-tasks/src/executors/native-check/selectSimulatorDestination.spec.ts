// #region Imports
import { describe, expect, it } from 'vitest';
import { selectSimulatorDestination } from './selectSimulatorDestination.js';
// #endregion

describe('selectSimulatorDestination', () => {
    it('reuses a booted available device rather than creating a second simulator', () => {
        // Arrange
        const first = {
            name: 'iPhone available',
            udid: '11111111-1111-1111-1111-111111111111',
            state: 'Shutdown',
            isAvailable: true,
        };
        const booted = { ...first, udid: '22222222-2222-2222-2222-222222222222', state: 'Booted' };
        // Act
        const result = selectSimulatorDestination({
            devices: { 'com.apple.CoreSimulator.SimRuntime.iOS-26-2': [first, booted] },
        });
        // Assert
        expect(result).toBe(`platform=iOS Simulator,id=${booted.udid}`);
    });

    it('rejects malformed and unavailable inventories instead of inventing a destination', () => {
        // Arrange / Act / Assert
        expect(() => selectSimulatorDestination(null)).toThrow('inventory');
        expect(() =>
            selectSimulatorDestination({
                devices: {
                    'com.apple.CoreSimulator.SimRuntime.iOS-26-2': [
                        {
                            name: 'iPhone',
                            udid: '11111111-1111-1111-1111-111111111111',
                            isAvailable: false,
                        },
                    ],
                },
            }),
        ).toThrow('No existing');
    });
});
