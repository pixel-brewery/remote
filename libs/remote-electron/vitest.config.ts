// #region Imports
import { defineConfig } from 'vitest/config';
// #endregion

export default defineConfig({ test: { include: ['src/**/*.spec.ts'], environment: 'node' } });
