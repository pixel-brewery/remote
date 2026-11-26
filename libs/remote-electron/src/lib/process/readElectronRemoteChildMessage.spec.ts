// #region Imports
import { describe, expect, it } from 'vitest';
import { readElectronRemoteChildMessage } from './readElectronRemoteChildMessage.js';
// #endregion

const identity = { appId: 'example.app', hostId: 'host-one' };

describe('readElectronRemoteChildMessage', () => {
    it('accepts exact lifecycle, reply and credential envelopes', () => {
        // Arrange
        const credential = 'c'.repeat(40);
        // Act / Assert
        expect(readElectronRemoteChildMessage({ kind: 'disposed' })).toEqual({ kind: 'disposed' });
        expect(readElectronRemoteChildMessage({ kind: 'reply', id: 'one', value: null })).toEqual({
            kind: 'reply',
            id: 'one',
            value: null,
        });
        expect(
            readElectronRemoteChildMessage({
                kind: 'credential',
                id: 'two',
                operation: 'set',
                identity,
                credential,
            }),
        ).toEqual({ kind: 'credential', id: 'two', operation: 'set', identity, credential });
    });
    it('drops additional keys, foreign shapes and misplaced bearers', () => {
        // Arrange
        const credential = 'c'.repeat(40);
        // Act / Assert
        for (const raw of [
            null,
            [],
            { kind: 'ready', extra: true },
            { kind: 'reply', id: '', value: null },
            { kind: 'reply', id: 'one', value: null, error: 'both' },
            { kind: 'reply', id: 'one', error: 'x'.repeat(513) },
            { kind: 'credential', id: 'one', operation: 'get', identity, credential },
            { kind: 'credential', id: 'one', operation: 'set', identity, credential: 'short' },
            { kind: 'credential', id: 'one', operation: 'list', identity },
            { kind: 'credential', id: 'one', operation: 'get', identity: { appId: 'Example' } },
        ])
            expect(readElectronRemoteChildMessage(raw)).toBeUndefined();
    });
});
