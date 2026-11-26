// #region Imports
import {
    createRemotePairingUrl,
    normalizeRemotePath,
    remoteErrorResponseSchema,
    remoteHostStatusSchema,
    remotePairingBootstrapSchema,
    type IRemoteErrorCode,
    type IRemoteHostStatusSnapshot,
    type IRemotePairingBootstrap,
} from '@pixel-brewery/remote-protocol';
import { decodeBoundedJson } from '../transport/decodeBoundedJson.js';
import { readResponseChunks } from '../transport/readResponseChunks.js';
import type { IRemoteHostControlClientOptions } from './interfaces/IRemoteHostControlClientOptions.js';
import { RemoteHostControlError } from './RemoteHostControlError.js';
// #endregion

/**
 * Browser client for an application's private local host-control endpoint.
 *
 * @remarks Reads the strictly validated host status and sends the explicit enable, disable, reconcile, pair and
 * revoke commands. Every call is dispatched exactly once with same-origin credentials, refused redirects, a
 * deadline and a bounded body; nothing is retried or cached. The client keeps no status: it owns only the abort
 * controller of each in-flight call. A failed mutating command may already have persisted its intent, so callers
 * read {@link RemoteHostControlClient.status} again before presenting the outcome.
 * @example
 * ```ts
 * const client = new RemoteHostControlClient({ fetch: window.fetch.bind(window) });
 * const status = await client.enable();
 * const url = client.createPairingUrl(await client.pair(), status);
 * client.dispose();
 * ```
 * @public
 */
export class RemoteHostControlClient {
    // #region Fields
    private readonly _prefix: string;
    private readonly _timeoutMs: number;
    private readonly _maxResponseBytes: number;
    private readonly _calls = new Set<AbortController>();
    private _disposed = false;
    // #endregion
    // #region Ctor
    /**
     * Validate the endpoint prefix and bounds without dispatching a request.
     *
     * @param _options - Bound fetch, optional availability guard, route prefix, deadline and response bound.
     * @throws TypeError for a prefix that is not a plain absolute path without trailing slash, query or fragment.
     * @throws RangeError when the deadline or response bound is not a positive safe integer.
     * @public
     */
    public constructor(private readonly _options: IRemoteHostControlClientOptions) {
        const prefix = _options.prefix ?? '/__host/remote/v1';
        let plain = false;
        try {
            plain =
                prefix.length <= 512 &&
                !prefix.includes('?') &&
                !prefix.endsWith('/') &&
                normalizeRemotePath(prefix) === prefix;
        } catch {
            plain = false;
        }
        if (!plain) throw new TypeError('The host-control prefix must be a plain absolute path.');
        this._prefix = prefix;
        this._timeoutMs = _options.timeoutMs ?? 15_000;
        this._maxResponseBytes = _options.maxResponseBytes ?? 262_144;
        for (const value of [this._timeoutMs, this._maxResponseBytes])
            if (!Number.isSafeInteger(value) || value < 1)
                throw new RangeError('Host-control bounds must be positive safe integers.');
    }
    // #endregion
    // #region Methods
    /**
     * Read the actual host status without changing activation or device grants.
     *
     * @returns The strictly validated, frozen status snapshot.
     * @throws RemoteHostControlError for an unavailable guard, disposal, deadline, transport, rejection or invalid body.
     * @public
     */
    public status(): Promise<IRemoteHostStatusSnapshot> {
        return this.send('status', undefined, remoteHostStatusSchema);
    }
    /**
     * Persist activation intent and wait for the host's resulting listener state.
     *
     * @returns The validated status after the command; activation may report an unavailable listener.
     * @throws RemoteHostControlError when the command fails; its intent may still have been saved.
     * @public
     */
    public enable(): Promise<IRemoteHostStatusSnapshot> {
        return this.send('enable', {}, remoteHostStatusSchema);
    }
    /**
     * Stop remote access and persist the disabled intent.
     *
     * @returns The validated status after the command.
     * @throws RemoteHostControlError when the command fails; read the status to learn the actual state.
     * @public
     */
    public disable(): Promise<IRemoteHostStatusSnapshot> {
        return this.send('disable', {}, remoteHostStatusSchema);
    }
    /**
     * Ask the host to recheck its selected private network address, for example after a network change or standby.
     *
     * @returns The validated status after reconciliation.
     * @throws RemoteHostControlError when the command fails.
     * @public
     */
    public reconcile(): Promise<IRemoteHostStatusSnapshot> {
        return this.send('reconcile', {}, remoteHostStatusSchema);
    }
    /**
     * Create one short-lived invitation for an advertised endpoint.
     *
     * @param endpointId - Optional advertised endpoint identifier, at most 120 characters; omission selects the host default.
     * @returns The schema-validated bootstrap. It is secret material: display it, never log or persist it.
     * @throws RemoteHostControlError with `invalid-request` for a malformed endpoint identifier, before dispatch.
     * @throws RemoteHostControlError when the command fails or returns an invalid bootstrap.
     * @public
     */
    public async pair(endpointId?: string): Promise<IRemotePairingBootstrap> {
        if (endpointId !== undefined && (endpointId.length < 1 || endpointId.length > 120))
            throw new RemoteHostControlError(
                'invalid-request',
                'The endpoint identifier is invalid.',
            );
        return this.send(
            'pair',
            endpointId === undefined ? {} : { endpointId },
            remotePairingBootstrapSchema,
        );
    }
    /**
     * Revoke exactly one device grant and wait for the host's durable result.
     *
     * @param deviceId - Identifier taken from the last status device list, at most 160 characters.
     * @returns The validated status after revocation.
     * @throws RemoteHostControlError with `invalid-request` for a malformed device identifier, before dispatch.
     * @throws RemoteHostControlError when the command fails.
     * @public
     */
    public async revoke(deviceId: string): Promise<IRemoteHostStatusSnapshot> {
        if (deviceId.length < 1 || deviceId.length > 160)
            throw new RemoteHostControlError(
                'invalid-request',
                'The device identifier is invalid.',
            );
        return this.send('revoke', { deviceId }, remoteHostStatusSchema);
    }
    /**
     * Check an invitation against the status it was created for and encode its pairing URL.
     *
     * @remarks The bootstrap must belong to the status host's app and installation, use one of its advertised
     * endpoint origins and expire within the next five minutes. Clear the URL from the view when it expires.
     * @param bootstrap - Invitation returned by {@link RemoteHostControlClient.pair}.
     * @param status - Current validated status of the same host.
     * @returns The fragment-based pairing URL for QR rendering or conscious copying; treat it as a secret.
     * @throws RemoteHostControlError with `invalid-invitation` for a malformed, foreign, unadvertised, expired or overlong invitation.
     * @public
     */
    public createPairingUrl(
        bootstrap: IRemotePairingBootstrap,
        status: IRemoteHostStatusSnapshot,
    ): string {
        const parsed = remotePairingBootstrapSchema.safeParse(bootstrap);
        const remaining = parsed.success ? Date.parse(parsed.data.expiresAt) - Date.now() : 0;
        if (
            !parsed.success ||
            parsed.data.appId !== status.host.identity.appId ||
            parsed.data.hostId !== status.host.identity.hostId ||
            !status.host.endpoints.some((endpoint) => endpoint.origin === parsed.data.origin) ||
            !(remaining > 0 && remaining <= 300_000)
        )
            throw new RemoteHostControlError(
                'invalid-invitation',
                'The invitation does not belong to this host or has expired.',
            );
        return createRemotePairingUrl(parsed.data);
    }
    /**
     * Abort every in-flight command and reject later calls.
     *
     * @remarks Idempotent. An aborted mutating command may still have reached the host.
     * @public
     */
    public dispose(): void {
        this._disposed = true;
        for (const call of this._calls) call.abort();
        this._calls.clear();
    }
    private async send<T>(
        command: string,
        body: object | undefined,
        schema: { parse(value: unknown): T },
    ): Promise<T> {
        if (this._disposed)
            throw new RemoteHostControlError('disposed', 'The host-control client is disposed.');
        let available = false;
        try {
            available = this._options.isAvailable?.() ?? true;
        } catch {
            available = false;
        }
        if (!available)
            throw new RemoteHostControlError(
                'unavailable',
                'Local host controls are unavailable in this context.',
            );
        const controller = new AbortController();
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            controller.abort();
        }, this._timeoutMs);
        this._calls.add(controller);
        const interrupted = (): RemoteHostControlError =>
            this._disposed
                ? new RemoteHostControlError('disposed', 'The host-control client is disposed.')
                : timedOut
                  ? new RemoteHostControlError('timeout', 'The host-control command timed out.')
                  : new RemoteHostControlError(
                        'network',
                        'The host-control endpoint is unreachable.',
                    );
        try {
            let response: Response;
            try {
                response = await this._options.fetch(`${this._prefix}/${command}`, {
                    method: body === undefined ? 'GET' : 'POST',
                    credentials: 'same-origin',
                    redirect: 'error',
                    cache: 'no-store',
                    signal: controller.signal,
                    ...(body === undefined
                        ? {}
                        : {
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(body),
                          }),
                });
            } catch {
                throw interrupted();
            }
            const json =
                response.headers.get('content-type')?.toLowerCase().includes('application/json') ===
                true;
            if (!response.ok) {
                const remoteCode = json ? await this.readErrorCode(response) : undefined;
                if (!json) await response.body?.cancel().catch(() => undefined);
                throw new RemoteHostControlError(
                    'rejected',
                    `The host-control command failed (${response.status}).`,
                    response.status,
                    remoteCode,
                );
            }
            if (!json) {
                await response.body?.cancel().catch(() => undefined);
                throw new RemoteHostControlError(
                    'invalid-response',
                    'The host-control endpoint did not answer with JSON.',
                );
            }
            let value: unknown;
            try {
                value = await decodeBoundedJson(
                    readResponseChunks(response),
                    this._maxResponseBytes,
                );
            } catch (error) {
                if (controller.signal.aborted) throw interrupted();
                if (error instanceof RangeError)
                    throw new RemoteHostControlError(
                        'response-too-large',
                        'The host-control response exceeds its configured bound.',
                    );
                throw new RemoteHostControlError(
                    'invalid-response',
                    'The host-control response is not valid JSON.',
                );
            }
            if (controller.signal.aborted) throw interrupted();
            try {
                return schema.parse(value);
            } catch {
                throw new RemoteHostControlError(
                    'invalid-response',
                    'The host-control response does not match its contract.',
                );
            }
        } finally {
            clearTimeout(timer);
            this._calls.delete(controller);
        }
    }
    private async readErrorCode(response: Response): Promise<IRemoteErrorCode | undefined> {
        try {
            const parsed = remoteErrorResponseSchema.safeParse(
                await decodeBoundedJson(
                    readResponseChunks(response),
                    Math.min(this._maxResponseBytes, 65_536),
                ),
            );
            return parsed.success ? parsed.data.error.code : undefined;
        } catch {
            return undefined;
        }
    }
    // #endregion
}
