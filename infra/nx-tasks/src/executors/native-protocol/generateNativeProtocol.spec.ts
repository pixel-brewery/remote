// #region Imports
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateNativeProtocol } from './generateNativeProtocol.js';
// #endregion

describe('generateNativeProtocol', () => {
    it('produces identical platform resources and detects stale native contracts', async () => {
        // Arrange
        const root = await mkdtemp(join(tmpdir(), 'remote-native-protocol-'));
        const android = join(
            root,
            'libs/remote-capacitor/android/src/main/assets/remote-protocol-v1.json',
        );
        const ios = join(
            root,
            'libs/remote-capacitor/ios/sources/remotecapacitor/resources/remote-protocol-v1.json',
        );
        try {
            // Act
            await generateNativeProtocol(root, 'write');
            const androidContents = await readFile(android, 'utf8');
            const iosContents = await readFile(ios, 'utf8');
            // Assert
            expect(androidContents).toBe(iosContents);
            expect(JSON.parse(androidContents)).toMatchObject({
                protocolVersion: 1,
                routes: { session: '/__remote/v1/session' },
            });
            await expect(generateNativeProtocol(root, 'check')).resolves.toBe(2);
            await writeFile(android, '{}');
            await expect(generateNativeProtocol(root, 'check')).rejects.toThrow(
                'Native protocol drift',
            );
            expect(await readFile(android, 'utf8')).toBe('{}');
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    it('requires generated resources rather than accepting a missing platform', async () => {
        // Arrange
        const root = await mkdtemp(join(tmpdir(), 'remote-native-protocol-'));
        try {
            // Act / Assert
            await expect(generateNativeProtocol(root, 'check')).rejects.toThrow(
                'Native protocol drift',
            );
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });
});
