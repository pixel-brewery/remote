// #region Imports
import { InjectionToken } from '@angular/core';
import type { RemoteSession } from '@pixel-brewery/remote-client';
// #endregion

/**
 * Application-scoped canonical session token; consumers do not construct a second state owner.
 * @public
 */
export const REMOTE_SESSION = new InjectionToken<RemoteSession>('PixelBreweryRemoteSession');
