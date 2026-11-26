/**
 * Decide whether a document URL belongs to one trusted renderer location.
 *
 * @remarks Internal Main policy. A `file:` location matches only the same file (any fragment, so
 * hash routing is preserved); an HTTP(S) location matches its exact origin. URLs with user
 * information, unparsable values and values longer than 8192 characters never match.
 * @param value - Actual sender frame or navigation URL.
 * @param expected - Trusted local renderer file URL, renderer origin or active gateway origin.
 * @returns True only for a document of exactly that renderer location.
 * @internal
 */
export function matchesRendererUrl(value: string, expected: string): boolean {
    if (value.length > 8192) return false;
    try {
        const actual = new URL(value),
            allowed = new URL(expected);
        if (actual.username || actual.password || allowed.username || allowed.password)
            return false;
        if (allowed.protocol === 'file:') {
            actual.hash = '';
            allowed.hash = '';
            return actual.href === allowed.href;
        }
        return (
            (allowed.protocol === 'http:' || allowed.protocol === 'https:') &&
            actual.origin === allowed.origin
        );
    } catch {
        return false;
    }
}
