/**
 * Performs bounded metadata requests without displaying tokens or response bodies.
 * @param method - Read evidence or create the immutable release tag.
 * @param endpoint - Relative fixed-policy GitHub REST endpoint.
 * @param body - Optional owned tag payload.
 * @returns Parsed JSON or undefined for an empty successful response.
 * @throws A status-bearing public diagnostic for network or HTTP failures.
 * @public
 */
export async function requestReleaseGitHub(
    method: 'GET' | 'POST',
    endpoint: string,
    body?: Readonly<Record<string, unknown>>,
): Promise<unknown> {
    const token = process.env['GH_TOKEN'] ?? process.env['GITHUB_TOKEN'];
    if (method !== 'GET' && !token)
        throw new Error('The approved workflow token is required for tag creation.');
    let response: Response;
    try {
        response = await fetch('https://api.github.com/' + endpoint, {
            method,
            redirect: 'error',
            signal: AbortSignal.timeout(15_000),
            headers: {
                Accept: 'application/vnd.github+json',
                'X-GitHub-Api-Version': '2026-03-10',
                ...(token ? { Authorization: 'Bearer ' + token } : {}),
                'Content-Type': 'application/json',
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
        });
    } catch {
        throw new Error('GitHub release metadata request could not be completed.');
    }
    if (!response.ok)
        throw Object.assign(
            new Error(`GitHub release metadata request returned HTTP ${response.status}.`),
            { status: response.status },
        );
    if (response.status === 204) return undefined;
    const text = await response.text();
    if (text.length > 8 * 1024 * 1024)
        throw new Error('GitHub release metadata exceeds its bound.');
    if (!text) return undefined;
    try {
        return JSON.parse(text) as unknown;
    } catch {
        throw new Error('GitHub release metadata was not valid JSON.');
    }
}
