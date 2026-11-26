/**
 * Tests supported numeric private LAN addresses. Loopback requires a separate allowance.
 *
 * @param address - Numeric IPv4 or unscoped IPv6, optionally enclosed in matching brackets.
 * @returns Whether a syntactically complete address belongs to RFC1918 or IPv6 unique-local space.
 * @public
 */
export function isPrivateAddress(address: string): boolean {
    let value = address.toLowerCase();
    if (value.startsWith('[') || value.endsWith(']')) {
        if (!value.startsWith('[') || !value.endsWith(']')) return false;
        value = value.slice(1, -1);
    }
    const ipv4 = (input: string): readonly number[] | null => {
        const parts = input.split('.');
        return parts.length === 4 &&
            parts.every((part) => /^(0|[1-9][0-9]{0,2})$/u.test(part) && Number(part) <= 255)
            ? parts.map(Number)
            : null;
    };
    const octets = ipv4(value);
    if (octets)
        return (
            octets[0] === 10 ||
            (octets[0] === 172 && octets[1]! >= 16 && octets[1]! <= 31) ||
            (octets[0] === 192 && octets[1] === 168)
        );
    if (!value.includes(':') || /[^0-9a-f:.]/u.test(value)) return false;
    const halves = value.split('::');
    if (halves.length > 2) return false;
    const groups = halves.flatMap((part) => (part ? part.split(':') : []));
    if (
        groups.some((part, index) =>
            part.includes('.')
                ? index !== groups.length - 1 || !ipv4(part)
                : !/^[0-9a-f]{1,4}$/u.test(part),
        )
    )
        return false;
    const width = groups.reduce((count, part) => count + (part.includes('.') ? 2 : 1), 0);
    if (halves.length === 1 ? width !== 8 : width >= 8) return false;
    const first = halves[0] ? Number.parseInt(groups[0]!, 16) : 0;
    return (first & 0xfe00) === 0xfc00;
}
