// #region Imports
import { describe, expect, it } from 'vitest';
import { getPackedPackageDefinitions } from './getPackedPackageDefinitions.js';
import type { IPackedPackageManifest } from './interfaces/IPackedPackageManifest.js';
import { verifyPackedImports } from './verifyPackedImports.js';
// #endregion

const definitions = getPackedPackageDefinitions();
const portable = definitions[0]!;
const manifest: IPackedPackageManifest = {
    name: portable.name,
    version: '0.1.0',
    dependencies: { zod: '4.6.7' },
};

describe('verifyPackedImports', () => {
    it('accepts relative owners and explicitly published portable dependencies', () => {
        // Arrange
        const text = "export { z } from 'zod'; import type { Local } from './interfaces/Local.js';";
        // Act and Assert
        expect(() =>
            verifyPackedImports(portable, manifest, 'dist/index.d.ts', text),
        ).not.toThrow();
    });

    it.each([
        "import { readFile } from 'node:fs';",
        "export { readFile } from 'fs';",
        "const crypto = import('node:crypto');",
        "type Socket = import('node:net').Socket;",
        "/// <reference types='node' />\nexport interface Portable {}",
        "import { app } from 'electron';",
        "import { Component } from '@angular/core';",
        "import { Plugin } from '@capacitor/core';",
        "export { Host } from '@pixel-brewery/remote-node';",
        "export { Hidden } from '../../outside.js';",
        "import '/workspace/alias.js';",
    ])('rejects a shipped portable boundary violation: %s', (text) => {
        // Arrange and Act
        const act = (): void => verifyPackedImports(portable, manifest, 'dist/index.js', text);
        // Assert
        expect(act).toThrow();
    });

    it('allows Node builtins only in a platform owner with an inward SDK graph', () => {
        // Arrange
        const node = definitions.find((definition) => definition.name.endsWith('-node'))!;
        const published: IPackedPackageManifest = {
            name: node.name,
            version: '0.1.0',
            dependencies: { '@pixel-brewery/remote-core': '0.1.0', ws: '8.23.0' },
        };
        // Act and Assert
        expect(() =>
            verifyPackedImports(
                node,
                published,
                'dist/host.js',
                "import { createServer } from 'node:http'; import { Host } from '@pixel-brewery/remote-core'; import WebSocket from 'ws';",
            ),
        ).not.toThrow();
    });

    it('rejects Node imports in shipped browser adapter code despite the consumer Node typings', () => {
        // Arrange
        const browser = definitions.find((definition) => definition.name.endsWith('-browser'))!;
        // Act and Assert
        expect(() =>
            verifyPackedImports(
                browser,
                { name: browser.name, version: '0.1.0' },
                'dist/index.js',
                "import { readFile } from 'node:fs';",
            ),
        ).toThrow();
    });
});
