// #region Imports
import { defineConfig } from '@playwright/test';
// #endregion

export default defineConfig({
    testDir: 'e2e',
    testMatch: '**/*.e2e.spec.ts',
    timeout: 90_000,
    workers: 1,
    retries: 0,
    outputDir: 'output/playwright/results',
    use: { testIdAttribute: 'test-id', trace: 'off' },
    reporter: 'list',
});
