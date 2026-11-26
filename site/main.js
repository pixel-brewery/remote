// #region Imports
import 'reflect-metadata';
import { ThemeService } from '@pixel-brewery/mosaik-elements-foundation/dist/theming/ThemeService';
import '@pixel-brewery/mosaik-elements-foundation/dist/controls/components/buttons/anchor/AnchorElement';
import '@pixel-brewery/mosaik-elements-foundation/dist/controls/components/buttons/button/ButtonElement';
import '@pixel-brewery/mosaik-elements-foundation/dist/controls/components/media/image/ImageElement';
import '@pixel-brewery/mosaik-elements-foundation/dist/controls/components/grouping/card/CardElement';
import theme from './theme/remoteTheme.json';
// #endregion

/**
 * Applies Remote's indigo identity to the shared Soho portfolio foundations.
 *
 * @remarks Generated from the pinned Mosaik runtime by the theme-artifact Nx owner.
 * Runtime clients retain ownership of their own application theme.
 *
 * @internal
 */
const remoteTheme = theme;
ThemeService.instance.applyTheme(remoteTheme);

for (const link of document.querySelectorAll(
    'mosaik-button[data-href], mosaik-anchor[data-href]',
)) {
    link.href = link.dataset.href;
}

document.getElementById('brand-icon').src = document.querySelector('link[rel="icon"]').href;
document.getElementById('hero-art').src = new URL('assets/hero.webp', document.baseURI).href;
