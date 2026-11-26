/**
 * Fixes repository, registry and genuine workflow/job identities for this publisher.
 *
 * @public
 */
export const releasePolicy = Object.freeze({
    repositoryId: 1472760702 as const,
    repository: 'pixel-brewery/remote',
    repositoryPath: 'repos/pixel-brewery/remote',
    registry: 'https://npm.pkg.github.com',
    verifyWorkflow: '.github/workflows/ci.yml',
    verifyName: 'Verify',
    verifyJobs: ['verify', 'android', 'ios'] as const,
    releaseWorkflow: '.github/workflows/release-packages.yml',
    releaseName: 'Release packages',
    prepareJob: 'prepare',
});
