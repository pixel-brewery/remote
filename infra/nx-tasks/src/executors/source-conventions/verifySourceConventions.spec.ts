// #region Imports
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { verifySourceConventions } from './verifySourceConventions.js';
// #endregion

const declaration = `/**\n * Describes the identity of one paired installation.\n *\n * @public\n */\nexport interface IIdentity {\n    /**\n     * Stable installation identifier.\n     *\n     * @public\n     */\n    readonly id: string;\n}\n`;

describe('verifySourceConventions', () => {
    it('accepts a documented feature contract and rejects stale Git directory casing', async () => {
        // Arrange
        const root = await mkdtemp(join(tmpdir(), 'remote-source-conventions-'));
        const file = 'libs/example/src/lib/pairing/interfaces/IIdentity.ts';
        try {
            await mkdir(dirname(join(root, file)), { recursive: true });
            await writeFile(join(root, file), declaration);
            // Act / Assert
            await expect(verifySourceConventions(root, [file])).resolves.toBe(1);
            await expect(
                verifySourceConventions(root, [file.replace('/pairing/', '/Pairing/')]),
            ).rejects.toThrow('Git index casing differs');
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });

    it('rejects a flat interface with incomplete public documentation', async () => {
        // Arrange
        const root = await mkdtemp(join(tmpdir(), 'remote-source-conventions-'));
        const file = join(root, 'libs/example/src/lib/IIdentity.ts');
        try {
            await mkdir(dirname(file), { recursive: true });
            await writeFile(
                file,
                '/** Identity. @public */\nexport interface IIdentity { readonly id: string; }',
            );
            // Act / Assert
            await expect(verifySourceConventions(root, [])).rejects.toThrow('Interfaces belong');
            await expect(verifySourceConventions(root, [])).rejects.toThrow('Use multiline TSDoc');
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });
    it('requires a separate access tag on each interface member', async () => {
        // Arrange
        const root = await mkdtemp(join(tmpdir(), 'remote-source-conventions-'));
        const file = join(root, 'libs/example/src/lib/pairing/interfaces/IIdentity.ts');
        try {
            await mkdir(dirname(file), { recursive: true });
            await writeFile(file, declaration.replace('     * @public\n', ''));
            // Act / Assert
            await expect(verifySourceConventions(root, [])).rejects.toThrow(
                'Place the declaration access tag on its own TSDoc line',
            );
        } finally {
            await rm(root, { recursive: true, force: true });
        }
    });
});
