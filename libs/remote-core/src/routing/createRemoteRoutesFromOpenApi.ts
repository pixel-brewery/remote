// #region Imports
import {
    normalizeRemotePath,
    RemoteProtocolError,
    type IRemoteRouteDefinition,
} from '@pixel-brewery/remote-protocol';
import { RemoteRouteRegistry } from './RemoteRouteRegistry.js';
import type { IRemoteOpenApiDocument } from './interfaces/IRemoteOpenApiDocument.js';
import type { IRemoteOpenApiOperation } from './interfaces/IRemoteOpenApiOperation.js';
import type { IRemoteOpenApiPathItem } from './interfaces/IRemoteOpenApiPathItem.js';
import type { IRemoteOpenApiRoutePolicy } from './interfaces/IRemoteOpenApiRoutePolicy.js';
// #endregion

const methods = [
    ['GET', 'get'],
    ['HEAD', 'head'],
    ['POST', 'post'],
    ['PUT', 'put'],
    ['PATCH', 'patch'],
    ['DELETE', 'delete'],
] as const satisfies ReadonlyArray<
    readonly [IRemoteRouteDefinition['method'], keyof IRemoteOpenApiPathItem]
>;
const defaultMaxRequestBytes = 4194304;

/**
 * Derives explicit remote route registrations from an application's actual OpenAPI contract.
 *
 * @remarks
 * The policy is an allowlist: only operations below an included prefix and
 * outside every excluded prefix are admitted, and methods other than GET, HEAD,
 * POST, PUT, PATCH and DELETE are ignored. GET and HEAD require the read
 * capability and may be retried as safe reads; every other method requires the
 * write capability and is never replayed. An operation with an inline
 * `text/event-stream` response becomes an `sse` route and is never retried.
 * Complete `{name}` template segments become `:name` parameters; partial,
 * duplicate or colon-prefixed literal segments are rejected. Each operation's
 * `operationId` becomes the route identifier and must be unique. Every route
 * carries an explicit request quota: the longest matching per-prefix limit or
 * the policy default of 4 MiB. The complete result is validated by
 * {@link RemoteRouteRegistry}, so reserved SDK paths and overlapping patterns
 * fail. Routes keep the document's path order and GET, HEAD, POST, PUT, PATCH,
 * DELETE method order. Derivation performs no I/O and starts no listener.
 *
 * @param document - Structural OpenAPI 3 document whose `paths` are read; references are not resolved.
 * @param policy - Application-owned prefixes, capabilities and request quotas selecting remote operations.
 * @returns A frozen array of frozen route definitions; empty when no operation is admitted.
 * @throws RemoteProtocolError with `invalid-request` for an invalid policy, malformed operation metadata,
 * a missing, oversized or duplicate operation identifier, an unsupported path parameter, or a route set
 * that the route registry rejects.
 *
 * @example
 * ```ts
 * const routes = createRemoteRoutesFromOpenApi(openApiDocument, {
 *     include: ['/api/documents'],
 *     exclude: ['/api/documents/export'],
 *     readCapability: 'documents:read',
 *     writeCapability: 'documents:write',
 *     requestLimits: [{ prefix: '/api/documents/uploads', maxRequestBytes: 16777216 }],
 * });
 * ```
 *
 * @public
 */
export function createRemoteRoutesFromOpenApi(
    document: IRemoteOpenApiDocument,
    policy: IRemoteOpenApiRoutePolicy,
): readonly IRemoteRouteDefinition[] {
    if (!Array.isArray(policy.include) || policy.include.length === 0)
        invalid('The remote route policy must include at least one prefix.');
    const include = policy.include.map(prefix);
    const exclude = (policy.exclude ?? []).map(prefix);
    const readCapability = capability(policy.readCapability);
    const writeCapability = capability(policy.writeCapability);
    const fallbackLimit = quota(policy.maxRequestBytes ?? defaultMaxRequestBytes);
    const limits = (policy.requestLimits ?? []).map((limit) => ({
        prefix: prefix(limit.prefix),
        maxRequestBytes: quota(limit.maxRequestBytes),
    }));
    if (new Set(limits.map((limit) => limit.prefix)).size !== limits.length)
        invalid('A remote request limit prefix is declared more than once.');
    if (typeof document !== 'object' || document === null || !isRecord(document.paths))
        invalid('The OpenAPI document has no path metadata.');
    const routes: IRemoteRouteDefinition[] = [];
    const identifiers = new Set<string>();
    const excludedOperations: { readonly method: string; readonly path: string }[] = [];
    for (const [template, item] of Object.entries(document.paths)) {
        if (item === undefined || !include.some((value) => covers(value, template))) continue;
        if (exclude.some((value) => covers(value, template))) {
            if (isRecord(item))
                for (const [method, key] of methods)
                    if (item[key] !== undefined)
                        excludedOperations.push({ method, path: routePath(template) });
            continue;
        }
        if (!isRecord(item)) invalid('The OpenAPI path metadata is invalid.');
        const path = routePath(template);
        const maxRequestBytes = limits
            .filter((limit) => covers(limit.prefix, template))
            .reduce<{ readonly prefix: string; readonly maxRequestBytes: number } | undefined>(
                (selected, limit) =>
                    !selected || limit.prefix.length > selected.prefix.length ? limit : selected,
                undefined,
            )?.maxRequestBytes;
        for (const [method, key] of methods) {
            const operation: unknown = item[key];
            if (operation === undefined) continue;
            if (!isRecord(operation)) invalid('The OpenAPI operation metadata is invalid.');
            const contract = operation as IRemoteOpenApiOperation;
            const id = contract.operationId;
            if (typeof id !== 'string' || !id || id.length > 160 || identifiers.has(id))
                invalid('Remote operations require unique stable identifiers.');
            identifiers.add(id);
            const eventStream = isEventStream(contract);
            const read = method === 'GET' || method === 'HEAD';
            routes.push(
                Object.freeze({
                    id,
                    method,
                    path,
                    kind: eventStream ? 'sse' : 'http',
                    capabilities: Object.freeze([read ? readCapability : writeCapability]),
                    retry: read && !eventStream ? 'safe-read' : 'never',
                    maxRequestBytes: maxRequestBytes ?? fallbackLimit,
                }),
            );
        }
    }
    // An admitted parameter route that also matches an excluded operation's path would be admitted for
    // that request, and the application's router may then dispatch the excluded handler.
    for (const excluded of excludedOperations)
        for (const route of routes)
            if (route.method === excluded.method && overlaps(route.path, excluded.path))
                invalid(
                    `The admitted route ${route.method} ${route.path} can also match the excluded operation ${excluded.method} ${excluded.path}.`,
                );
    // The registry owns admission rules; constructing it rejects reserved, malformed or overlapping routes.
    new RemoteRouteRegistry(routes);
    return Object.freeze(routes);
}

/**
 * Converts one OpenAPI path template into a registry route pattern.
 *
 * @param template - OpenAPI path template whose complete `{name}` segments become parameters.
 * @returns The equivalent colon-parameter route path.
 * @throws RemoteProtocolError for query or fragment syntax, partial, duplicate or colon-prefixed segments.
 *
 * @internal
 */
function routePath(template: string): string {
    if (!template.startsWith('/') || /[?#]/u.test(template))
        invalid('Remote route metadata must contain only a path.');
    const names = new Set<string>();
    return template
        .split('/')
        .map((segment) => {
            const parameter = /^\{([A-Za-z][A-Za-z0-9_]*)\}$/u.exec(segment)?.[1];
            if (parameter !== undefined) {
                if (names.has(parameter)) invalid('A remote route parameter is declared twice.');
                names.add(parameter);
                return ':' + parameter;
            }
            if (/[{}]/u.test(segment) || segment.startsWith(':'))
                invalid('Unsupported remote route parameter.');
            return segment;
        })
        .join('/');
}

/**
 * Detects an inline event-stream response media type.
 *
 * @param operation - Operation whose declared responses are inspected.
 * @returns True when any inline response declares `text/event-stream`, ignoring media-type parameters and case.
 * @throws RemoteProtocolError when the responses metadata is not an object.
 *
 * @internal
 */
function isEventStream(operation: IRemoteOpenApiOperation): boolean {
    const responses: unknown = operation.responses;
    if (responses === undefined) return false;
    if (!isRecord(responses)) invalid('The OpenAPI response metadata is invalid.');
    return Object.values(responses).some((response) => {
        const content = isRecord(response) ? response['content'] : undefined;
        return (
            isRecord(content) &&
            Object.keys(content).some(
                (type) => type.split(';')[0]?.trim().toLowerCase() === 'text/event-stream',
            )
        );
    });
}

/**
 * Tests whether a policy prefix covers an OpenAPI path on complete segments.
 *
 * @param value - Validated policy prefix; `/` covers every path.
 * @param template - OpenAPI path template being selected.
 * @returns True when the template equals the prefix or lies below it.
 *
 * @internal
 */
/**
 * Reports whether two route patterns can match the same request path.
 *
 * @param left - First colon-parameter route pattern.
 * @param right - Second colon-parameter route pattern.
 * @returns True when both have the same segment count and every segment pair is equal or contains a parameter.
 *
 * @internal
 */
function overlaps(left: string, right: string): boolean {
    const first = left.split('/');
    const second = right.split('/');
    return (
        first.length === second.length &&
        first.every(
            (segment, index) =>
                segment === second[index] ||
                segment.startsWith(':') ||
                (second[index] ?? '').startsWith(':'),
        )
    );
}

function covers(value: string, template: string): boolean {
    return value === '/' || template === value || template.startsWith(value + '/');
}

/**
 * Validates one policy path prefix.
 *
 * @param value - Candidate prefix supplied by the application policy.
 * @returns The unchanged canonical prefix.
 * @throws RemoteProtocolError when the prefix is not a canonical path without trailing slash.
 *
 * @internal
 */
function prefix(value: unknown): string {
    let canonical = false;
    try {
        canonical =
            typeof value === 'string' &&
            value.length <= 2048 &&
            normalizeRemotePath(value) === value &&
            (value === '/' || !value.endsWith('/'));
    } catch {
        canonical = false;
    }
    if (!canonical) invalid('A remote route policy prefix is invalid.');
    return value as string;
}

/**
 * Validates one capability name required by derived routes.
 *
 * @param value - Candidate capability supplied by the application policy.
 * @returns The unchanged capability.
 * @throws RemoteProtocolError when the capability is empty, not a string or longer than 160 characters.
 *
 * @internal
 */
function capability(value: unknown): string {
    if (typeof value !== 'string' || !value || value.length > 160)
        invalid('A remote route policy capability is invalid.');
    return value;
}

/**
 * Validates one request-body quota.
 *
 * @param value - Candidate byte quota supplied by the application policy.
 * @returns The unchanged quota.
 * @throws RemoteProtocolError when the quota is not a non-negative safe integer.
 *
 * @internal
 */
function quota(value: unknown): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
        invalid('A remote request limit is invalid.');
    return value;
}

/**
 * Narrows untrusted metadata to a non-array object.
 *
 * @param value - Candidate metadata value.
 * @returns True for a non-null, non-array object.
 *
 * @internal
 */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Rejects invalid route metadata without echoing the submitted values.
 *
 * @param message - Fixed safe diagnostic.
 * @throws RemoteProtocolError with `invalid-request`.
 *
 * @internal
 */
function invalid(message: string): never {
    throw new RemoteProtocolError('invalid-request', message);
}
