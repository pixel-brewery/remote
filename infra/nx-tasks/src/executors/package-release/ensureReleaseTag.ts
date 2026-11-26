// #region Imports
import assert from 'node:assert/strict';
import type { IPackageReleaseOptions } from './interfaces/IPackageReleaseOptions.js';
import type { IReleaseRequest } from './interfaces/IReleaseRequest.js';
import { releaseFields as fields } from './releaseFields.js';
import { releasePolicy as policy } from './releasePolicy.js';
// #endregion

/**
 * Creates or verifies one lightweight source tag without updating existing refs.
 * @param options - Exact approved source/version.
 * @param request - Tag metadata boundary after all manual/source/artifact checks.
 * @param create - Explicit permission from the publisher; false performs reads only.
 * @returns The immutable tag name after actual GitHub confirmation.
 * @throws An error for a collision, missing read-only tag or failed tag confirmation.
 * @public
 */
export async function ensureReleaseTag(
    options: IPackageReleaseOptions,
    request: IReleaseRequest,
    create: boolean,
): Promise<string> {
    const tag = 'v' + options.familyVersion;
    const endpoint = `${policy.repositoryPath}/git/ref/tags/${tag}`;
    let existing: unknown;
    try {
        existing = await request('GET', endpoint);
    } catch (error) {
        if (fields(error)['status'] !== 404) throw error;
    }
    if (!existing) {
        assert(create, 'Release tag does not exist; read-only verification cannot create it.');
        await request('POST', `${policy.repositoryPath}/git/refs`, {
            ref: 'refs/tags/' + tag,
            sha: options.sourceSha,
        });
        existing = await request('GET', endpoint);
    }
    const reference = fields(existing);
    assert.equal(reference['ref'], 'refs/tags/' + tag);
    assert.equal(fields(reference['object'])['type'], 'commit');
    assert.equal(
        fields(reference['object'])['sha'],
        options.sourceSha,
        'Existing release tag points at another source; never move it.',
    );
    return tag;
}
