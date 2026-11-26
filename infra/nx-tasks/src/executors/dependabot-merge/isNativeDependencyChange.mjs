const version = '[0-9]+(?:\\.[0-9]+){0,3}(?:[-+][0-9A-Za-z.-]+)?';
const gradlePatterns = [
    new RegExp(`^(\\s*id\\("[a-zA-Z0-9_.-]+"\\)\\s+version\\s+")${version}("\\s*)$`, 'u'),
    new RegExp(
        `^(\\s*classpath\\("org\\.jetbrains\\.kotlin:kotlin-gradle-plugin:)${version}("\\)\\s*)$`,
        'u',
    ),
    new RegExp(`^(\\s*val\\s+(?:ktor|[a-zA-Z0-9_]*Version)\\s*=\\s*")${version}("\\s*)$`, 'u'),
    new RegExp(
        `^(\\s*(?:implementation|api|testImplementation|androidTestImplementation|compileOnly|runtimeOnly)\\("[a-zA-Z0-9_.-]+:[a-zA-Z0-9_.-]+:)${version}("\\)\\s*)$`,
        'u',
    ),
];
const swiftPattern = new RegExp(
    `^(\\s*\\.package\\(url:\\s*"https://github\\.com/[^"\\s?#]+",\\s*(?:from|exact):\\s*")${version}("\\),?\\s*)$`,
    'u',
);

/**
 * Accepts version-only native manifest changes and bounded Swift resolution data.
 *
 * @remarks The trusted controller separately verifies the bot, repository,
 * protected branch and exact successful native jobs. This predicate does not
 * authorize a merge and never evaluates Gradle or Swift source.
 *
 * @param path - Exact application-owned native manifest path.
 * @param before - UTF-8 contents at the pull request's base SHA.
 * @param after - UTF-8 contents at the pull request's head SHA.
 * @returns Whether only supported native dependency metadata changed.
 *
 * @public
 */
export function isNativeDependencyChange(path, before, after) {
    if (
        typeof before !== 'string' ||
        typeof after !== 'string' ||
        before === after ||
        before.length > 262144 ||
        after.length > 262144
    )
        return false;
    if (path === 'libs/remote-capacitor/android/build.gradle.kts')
        return normalizeLines(before, gradlePatterns) === normalizeLines(after, gradlePatterns);
    if (path === 'libs/remote-capacitor/Package.swift')
        return normalizeLines(before, [swiftPattern]) === normalizeLines(after, [swiftPattern]);
    if (path !== 'libs/remote-capacitor/Package.resolved') return false;
    try {
        const previous = JSON.parse(before);
        const next = JSON.parse(after);
        return (
            validResolution(previous) && validResolution(next) && previous.version === next.version
        );
    } catch {
        return false;
    }
}

function normalizeLines(contents, patterns) {
    return contents
        .split('\n')
        .map((line) => {
            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) return `${match[1]}<dependency-version>${match[2]}`;
            }
            return line;
        })
        .join('\n');
}

function validResolution(value) {
    if (
        !value ||
        ![2, 3].includes(value.version) ||
        !Array.isArray(value.pins) ||
        value.pins.length > 256 ||
        Object.keys(value).some((key) => !['version', 'originHash', 'pins'].includes(key))
    )
        return false;
    if (value.originHash !== undefined && !/^[a-f0-9]{64}$/u.test(value.originHash)) return false;
    const identities = new Set();
    return value.pins.every((pin) => {
        if (
            !pin ||
            !/^[a-z0-9][a-z0-9.-]*$/u.test(pin.identity) ||
            identities.has(pin.identity) ||
            pin.kind !== 'remoteSourceControl' ||
            Object.keys(pin).some((key) => !['identity', 'kind', 'location', 'state'].includes(key))
        )
            return false;
        identities.add(pin.identity);
        const location = new URL(pin.location);
        if (
            location.protocol !== 'https:' ||
            location.hostname !== 'github.com' ||
            location.username ||
            location.password ||
            location.search ||
            location.hash ||
            !/^\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/u.test(location.pathname)
        )
            return false;
        return (
            pin.state &&
            Object.keys(pin.state).sort().join(',') === 'revision,version' &&
            /^[a-f0-9]{40}$/u.test(pin.state.revision) &&
            /^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$/u.test(pin.state.version)
        );
    });
}
