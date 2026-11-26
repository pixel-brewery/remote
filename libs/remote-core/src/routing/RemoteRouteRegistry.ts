// #region Imports
import {
    normalizeRemotePath,
    RemoteProtocolError,
    type IRemotePrincipal,
    type IRemoteRouteDefinition,
} from '@pixel-brewery/remote-protocol';
import type { IRemoteRegisteredRoute } from './interfaces/IRemoteRegisteredRoute.js';
// #endregion
/**
 * Immutable, deny-by-default product route admission shared by hosts and client gateways.
 *
 * @public
 */
export class RemoteRouteRegistry {
    // #region Fields
    private readonly _routes: readonly IRemoteRegisteredRoute[];
    // #endregion
    // #region Ctor
    /**
     * Registers exact methods and paths; colon-prefixed complete segments match one parameter.
     *
     * @param routes - Explicit exact-method registrations. Parameter segments begin with a colon and match one nonempty path segment.
     * @throws RemoteProtocolError for reserved routes, duplicate patterns or safe-read policy on a mutation.
     * @public
     */
    public constructor(routes: readonly IRemoteRouteDefinition[]) {
        const seen = new Set<string>();
        this._routes = routes.map((route) => {
            const path = normalizeRemotePath(route.path);
            if (
                path === '/__remote' ||
                path.startsWith('/__remote/') ||
                !route.id ||
                route.id.length > 160 ||
                route.path !== path ||
                !['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(route.method) ||
                !['http', 'sse', 'websocket'].includes(route.kind) ||
                !['never', 'safe-read'].includes(route.retry) ||
                route.capabilities.length > 256 ||
                route.capabilities.some((value) => !value || value.length > 160) ||
                path
                    .split('/')
                    .some(
                        (segment) =>
                            segment.startsWith(':') && !/^:[A-Za-z][A-Za-z0-9_]*$/u.test(segment),
                    ) ||
                (route.maxRequestBytes !== undefined &&
                    (!Number.isSafeInteger(route.maxRequestBytes) || route.maxRequestBytes < 0)) ||
                (route.retry === 'safe-read' && !['GET', 'HEAD'].includes(route.method))
            ) {
                throw new RemoteProtocolError(
                    'invalid-request',
                    'The product route definition is invalid.',
                );
            }
            const key =
                route.method +
                ' ' +
                path
                    .split('/')
                    .map((segment) => (segment.startsWith(':') ? ':parameter' : segment))
                    .join('/');
            if (seen.has(key))
                throw new RemoteProtocolError(
                    'invalid-request',
                    'A product route is registered more than once.',
                );
            seen.add(key);
            return {
                definition: Object.freeze({
                    ...route,
                    path,
                    capabilities: Object.freeze([...route.capabilities]),
                }),
                segments: path.split('/'),
            };
        });
    }
    // #endregion
    // #region Methods
    /**
     * Resolves one route without granting any device authority.
     *
     * @param method - Exact registered HTTP method to resolve.
     * @param input - Untrusted input validated by the canonical contract before use.
     * @returns The single most specific registered operation, without granting authorization.
     * @throws RemoteProtocolError when no unique operation is registered or the path is malformed.
     * @public
     */
    public match(method: string, input: string): IRemoteRouteDefinition {
        const segments = normalizeRemotePath(input).split('/');
        const matches = this._routes.filter(
            (route) =>
                route.definition.method === method &&
                route.segments.length === segments.length &&
                route.segments.every((segment, index) =>
                    segment.startsWith(':')
                        ? Boolean(segments[index])
                        : segment === segments[index],
                ),
        );
        matches.sort(
            (left, right) =>
                left.segments.filter((segment) => segment.startsWith(':')).length -
                right.segments.filter((segment) => segment.startsWith(':')).length,
        );
        const first = matches[0];
        const second = matches[1];
        if (
            !first ||
            (second &&
                first.segments.filter((segment) => segment.startsWith(':')).length ===
                    second.segments.filter((segment) => segment.startsWith(':')).length)
        ) {
            throw new RemoteProtocolError(
                'forbidden',
                'The operation is not available on this connection.',
            );
        }
        return first.definition;
    }
    /**
     * Resolves and checks every required capability at the actual request boundary.
     *
     * @param method - Exact registered HTTP method to resolve.
     * @param path - Origin-form request target whose path is admitted by the route registry; queries are preserved by transports.
     * @param principal - Authenticated app, installation, device and capability scope to enforce.
     * @returns The admitted route whose complete required capability set is present on the device principal.
     * @throws RemoteProtocolError when any required capability is absent.
     * @public
     */
    public authorize(
        method: string,
        path: string,
        principal: IRemotePrincipal,
    ): IRemoteRouteDefinition {
        const route = this.match(method, path);
        if (
            !route.capabilities.every((capability) => principal.capabilities.includes(capability))
        ) {
            throw new RemoteProtocolError(
                'forbidden',
                'This device cannot perform that operation.',
            );
        }
        return route;
    }
    // #endregion
}
