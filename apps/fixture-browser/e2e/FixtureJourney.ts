// #region Imports
import { expect, type Page } from '@playwright/test';
// #endregion

/**
 * Shared interactions over the real packaged UI and registered product operations.
 * @public
 */
export class FixtureJourney {
    // #region Methods
    /**
     * Wait for dedicated Remote authentication to finish in the actual rendered document.
     * @param page - Browser or Electron WebContents page.
     * @returns Completion when the visible lifecycle is ready.
     * @public
     */
    public static async ready(page: Page): Promise<void> {
        await page.waitForFunction(
            () =>
                (document.querySelector('#status') as HTMLElement & { content?: string })
                    ?.content === 'Connection: ready',
            undefined,
            { timeout: 20_000 },
        );
    }
    /**
     * Enter one selected invitation through the same controls used by a person.
     * @param page - Owned packaged page with its real native or browser connector.
     * @param invitation - Short-lived test invitation; never logged in evidence.
     * @returns Completion after the authenticated local/host view loads.
     * @public
     */
    public static async pair(page: Page, invitation: string): Promise<void> {
        await page.getByTestId('invitation').locator('input').fill(invitation);
        await page.getByTestId('pair').click();
        await this.ready(page);
    }
    /**
     * Verify original application requests and the counter's streaming/media paths.
     * @param page - Actual browser or in-app view.
     * @param kind - Independent fixture product whose domain model is exercised.
     * @returns Completion after writes, supported streams, multipart, responsive layout and keyboard checks.
     * @public
     */
    public static async exercise(page: Page, kind: 'counter' | 'notes'): Promise<void> {
        await this.ready(page);
        await page.getByTestId('read').click();
        await page.waitForFunction(() =>
            document.querySelector('#evidence')?.textContent?.includes('HTTP 200'),
        );
        if (kind === 'notes')
            await page
                .getByTestId('note')
                .locator('input')
                .fill('A note shared through the portable framework');
        await page.getByTestId('write').click();
        await page.waitForFunction(
            (product) =>
                document
                    .querySelector('#evidence')
                    ?.textContent?.includes(
                        product === 'notes'
                            ? 'HTTP 201'
                            : JSON.stringify(JSON.stringify({ value: 1 })),
                    ),
            kind,
        );
        if (kind === 'counter') {
            await page.getByTestId('events').click();
            await page.waitForFunction(() =>
                document.querySelector('#evidence')?.textContent?.includes('SSE counter'),
            );
            await page.getByTestId('socket').click();
            await page.waitForFunction(() =>
                document.querySelector('#evidence')?.textContent?.includes('Remote fixture echo'),
            );
            await page.getByTestId('range').click();
            await page.waitForFunction(() =>
                document.querySelector('#evidence')?.textContent?.includes('Range byte count: 8'),
            );
            await page.getByTestId('upload').click();
            await page.waitForFunction(() =>
                document
                    .querySelector('#evidence')
                    ?.textContent?.includes('FormData upload HTTP 200'),
            );
            await expect(page.locator('#evidence')).toContainText('multipart/form-data; boundary=');
            await expect(page.locator('#evidence')).toContainText('HTTP 206');
            await page.getByTestId('stop').click();
        }
        await page.setViewportSize({ width: 390, height: 844 });
        const previousSurface = await page
            .locator('body')
            .evaluate((body) => getComputedStyle(body).backgroundColor);
        await page.getByTestId('mode').click();
        await expect(page.locator('html')).toHaveAttribute('theme-mode', 'dark');
        await expect
            .poll(() =>
                page.locator('body').evaluate((body) => getComputedStyle(body).backgroundColor),
            )
            .not.toBe(previousSurface);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
            true,
        );
        await page.keyboard.press('Tab');
        expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('BODY');
    }
    // #endregion
}
