// #region Imports
import { ThemeService } from '@pixel-brewery/mosaik-elements-foundation/dist/theming/ThemeService';
import theme from './fixtureTheme.json' with { type: 'json' };
// #endregion

// Keep public web-component/theme runtime composition at the JavaScript boundary.
// ThemeService owns every generated token and both active color modes.
document.getElementById('fixture-theme').theme = theme;
document.getElementById('mode').addEventListener('click', () => {
    const mode = document.documentElement.getAttribute('theme-mode') === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('theme-mode', mode);
    ThemeService.instance.applyTheme(theme);
});
