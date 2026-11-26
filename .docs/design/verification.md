# Remote interface verification

The portfolio keeps the Cursor series composition and Soho/Inter foundations. The owner-approved link mark uses indigo `#5B4BDB`; petrol stays with Cursor. Site canvas colors are the explicit warm-ivory application overrides. The reference fixtures use the same public Soho runtime and generated indigo palettes in light and dark modes. Host applications keep their own themes.

## Catalog and source evidence

The actual local catalog was `@pixel-brewery/mosaik-mcp@0.1.205`, matching the installed component/theme family. [Consultation evidence](catalog-evidence.json) records authoring rules, the developer-portfolio template, centered product-preview recipe and its options, Button/Anchor/Image/Card documentation and anatomy, native usage and token guidance. Links use real Anchor/Button components, artwork uses Image, code panels use Card and technical `pre/code`; ordinary sections and semantic text use layout markup and the exact Mosaik typography tokens. No product CSS paints component internals.

The pinned Designer checker inspected all eight site/fixture templates, owning scripts and styles: 44 Mosaik components, zero errors, warnings or illustration exceptions. This source scan supplements manual API/source review; it does not alone establish rendered behavior.

`validate_theme` was also attempted with the generated compiled runtime objects. That catalog tool validates token-source objects (`name.value`, `font.family`, `color`, `typographyKey` and related fields), and rejected the runtime representation. These are recorded format-mismatch results, not successful token validation. The applications consume the public runtime shape directly through `Theme2Element`/`ThemeService`; no new Style Dictionary token-source theme is authored. The Nx `theme-artifact` owner reproducibly generates and drift-checks both JSON artifacts from the pinned public runtime and palette generator without patching package declarations.

## Executed browser evidence

The production site bundle was opened in the existing Chrome session at the real `/remote/` deployment base. At 1800 px and 390 px there was no horizontal page overflow. The icon and hero loaded from their actual built URLs. The package action navigated to `#packages`; Enter on the skip link focused the real main landmark. The browser reported no console errors or warnings. The screenshots were visually inspected for the indigo identity, readable hierarchy, responsive actions and unclipped artwork.

The fixtures' Chromium journeys exercised both products, visible light/dark mode, a 390 px viewport and keyboard interactions. Local network availability forced an explicitly labelled test-only loopback run; it is not evidence of an insecure private-LAN origin. The default CI journey retains its private-address and `isSecureContext === false` requirements. Native compilation, simulator tests, OS credential access and product journeys are separately recorded in the [testing guide](../guides/testing.md).
