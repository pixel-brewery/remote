// #region Imports
import type { IDependabotAutomation } from './interfaces/IDependabotAutomation.js';
import type { IDependabotConfiguration } from './interfaces/IDependabotConfiguration.js';
import type { IDependabotDependencies } from './interfaces/IDependabotDependencies.js';
// #endregion

/**
 * Creates the trusted reconciliation implementation without import-time effects.
 * @param configuration - Fixed repository identity and verification policy.
 * @param dependencies - Optional REST and polling boundaries.
 * @returns Operations for one pull request and the trusted workflow environment.
 * @public
 */
export declare function createDependabotAutomation(
    configuration?: IDependabotConfiguration,
    dependencies?: IDependabotDependencies,
): IDependabotAutomation;
