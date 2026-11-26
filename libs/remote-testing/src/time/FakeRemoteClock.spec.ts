// #region Imports
import { describe, expect, it } from 'vitest';
import { FakeRemoteClock } from './FakeRemoteClock.js';
// #endregion
describe('FakeRemoteClock', () => {
    it('runs equal deadlines in registration order, including nested timers, while respecting cancellation', () => {
        // Arrange
        const clock = new FakeRemoteClock(0);
        const events: string[] = [];
        clock.schedule(() => {
            events.push('first');
            clock.schedule(() => events.push('nested'), 5);
        }, 10);
        const cancel = clock.schedule(() => events.push('cancelled'), 10);
        clock.schedule(() => events.push('second'), 10);
        cancel();
        // Act
        clock.advance(15);
        // Assert
        expect(events).toEqual(['first', 'second', 'nested']);
        expect(clock.now()).toBe(15);
        expect(clock.pending).toBe(0);
    });
});
