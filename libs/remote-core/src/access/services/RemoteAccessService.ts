// #region Imports
import {
    remoteAccessStateSchema,
    remotePairingBootstrapSchema,
    remotePairingRequestSchema,
    RemoteProtocolError,
    type IRemoteAccessState,
    type IRemotePairingBootstrap,
    type IRemotePairingRequest,
    type IRemotePrincipal,
} from '@pixel-brewery/remote-protocol';
import type { IRemoteAccessDependencies } from '../interfaces/IRemoteAccessDependencies.js';
import type { IRemoteAccessStatus } from '../interfaces/IRemoteAccessStatus.js';
import type { IRemotePairingGrant } from '../../pairing/interfaces/IRemotePairingGrant.js';
import type { RemoteAccessEvent } from '../models/RemoteAccessEvent.js';
import type { IRemotePendingPairing } from '../../pairing/interfaces/IRemotePendingPairing.js';
// #endregion
/**
 * Owns durable device authorization and transient one-use pairing challenges.
 * All durable mutations are serialized through one writer. Applications own the store and clock.
 *
 * @public
 */
export class RemoteAccessService {
    // #region Fields
    private _state: IRemoteAccessState | undefined;
    private _mutations: Promise<void> = Promise.resolve();
    private _generation = 0;
    private readonly _pairings = new Map<string, IRemotePendingPairing>();
    private readonly _listeners = new Set<(event: RemoteAccessEvent) => void>();
    private readonly _lifetime: number;
    private readonly _maxPending: number;
    private readonly _maxDevices: number;
    // #endregion
    // #region Ctor
    /**
     * Binds one installation to application-owned infrastructure; performs no I/O.
     *
     * @param _dependencies - Application-owned persistence, entropy, clock, identity and pairing policy.
     * @public
     */
    public constructor(private readonly _dependencies: IRemoteAccessDependencies) {
        this._lifetime = _dependencies.pairingLifetimeMs ?? 300000;
        this._maxPending = _dependencies.maxPendingPairings ?? 32;
        this._maxDevices = _dependencies.maxDevices ?? 100;
        if (
            !Number.isInteger(this._lifetime) ||
            this._lifetime < 1 ||
            this._lifetime > 900000 ||
            !Number.isInteger(this._maxPending) ||
            this._maxPending < 1 ||
            this._maxPending > 128 ||
            !Number.isInteger(this._maxDevices) ||
            this._maxDevices < 1 ||
            this._maxDevices > 100 ||
            _dependencies.capabilities.length > 256
        ) {
            throw new RemoteProtocolError(
                'invalid-request',
                'The access resource limits are invalid.',
            );
        }
    }
    // #endregion
    // #region Properties
    /**
     * Whether durable initialization has completed.
     *
     * @returns True after successful canonical restoration or initial record creation.
     * @public
     */
    public get initialized(): boolean {
        return this._state !== undefined;
    }
    /**
     * The persisted activation intent; network availability is a transport responsibility.
     *
     * @returns The last committed activation intent; false before initialization.
     * @public
     */
    public get enabled(): boolean {
        return this._state?.enabled ?? false;
    }
    // #endregion
    // #region Methods
    /**
     * Restores and validates the private state once. A foreign installation record fails closed.
     *
     * @returns Resolves after validated restoration and any requested lifecycle reconciliation.
     * @throws RemoteProtocolError when storage fails or contains a malformed or foreign installation record.
     * @public
     */
    public initialize(): Promise<void> {
        return this.serialize(async () => {
            if (this._state) return;
            let value: unknown;
            try {
                value = await this._dependencies.store.load();
            } catch {
                throw new RemoteProtocolError(
                    'persistence',
                    'Unable to load device authorization.',
                );
            }
            if (value === null || value === undefined) {
                await this.commit(
                    remoteAccessStateSchema.parse({
                        version: 1,
                        identity: this._dependencies.identity,
                        enabled: false,
                        devices: [],
                    }),
                );
                return;
            }
            const parsed = remoteAccessStateSchema.safeParse(value);
            if (
                !parsed.success ||
                parsed.data.identity.appId !== this._dependencies.identity.appId ||
                parsed.data.identity.hostId !== this._dependencies.identity.hostId
            ) {
                throw new RemoteProtocolError(
                    'persistence',
                    'The stored device authorization is invalid for this installation.',
                );
            }
            this._state = parsed.data;
        });
    }
    /**
     * Saves activation intent. Disabling invalidates pending pairings and live authorization.
     *
     * @param enabled - Activation intent to commit before accepting new authorization requests.
     * @returns Resolves after the activation intent is durably committed.
     * @public
     */
    public setEnabled(enabled: boolean): Promise<void> {
        return this.serialize(async () => {
            const state = this.requireState();
            if (state.enabled !== enabled) await this.commit({ ...state, enabled });
            if (!enabled) {
                this.invalidatePendingPairings();
                this.emit({ kind: 'disabled' });
            }
        });
    }
    /**
     * Creates bounded transient material for the host's QR or copyable pairing URL.
     *
     * @param origin - Selected advertised HTTP(S) origin to bind into the one-use pairing invitation.
     * @returns The secret-bearing invitation for the selected endpoint. Deliver it out of band and never log it.
     * @remarks The default lifetime is five minutes and the challenge has 32 bytes of entropy. Only its digest is retained.
     * @throws RemoteProtocolError when access is disabled or the pending-invitation limit is reached.
     * @public
     */
    public createPairing(origin: string): Promise<IRemotePairingBootstrap> {
        return this.serialize(async () => {
            this.requireEnabled();
            this.prune();
            if (this._pairings.size >= this._maxPending) {
                throw new RemoteProtocolError(
                    'resource-limit',
                    'Too many pairing challenges are active.',
                );
            }
            const challenge = this._dependencies.security.randomToken(32);
            const expiresAt = new Date(
                this._dependencies.clock.now() + this._lifetime,
            ).toISOString();
            const bootstrap = remotePairingBootstrapSchema.parse({
                ...this._dependencies.identity,
                origin,
                challenge,
                expiresAt,
            });
            const secretHash = this._dependencies.security.hashToken(challenge);
            this._pairings.set(secretHash, { secretHash, expiresAt, generation: this._generation });
            return bootstrap;
        });
    }
    /**
     * Completes or resumes exactly one attempt. A challenge cannot be reassigned to another device.
     *
     * @param input - Canonical attempt with a stable client-generated identifier.
     * @returns An ephemeral grant, never a persisted cleartext credential.
     * @remarks Challenge possession consumes one attempt. Repeating the same attempt, label and credential mode is safe until expiry; another attempt is rejected.
     * @throws RemoteProtocolError for disabled access, expired or consumed challenges, bounds or persistence failures.
     * @public
     */
    public completePairing(input: IRemotePairingRequest): Promise<IRemotePairingGrant> {
        return this.serialize(async () => {
            this.requireEnabled();
            const parsed = remotePairingRequestSchema.safeParse(input);
            if (!parsed.success)
                throw new RemoteProtocolError('invalid-request', 'The pairing request is invalid.');
            const request = parsed.data;
            const hash = this._dependencies.security.hashToken(request.challenge);
            const pairing = this._pairings.get(hash);
            if (
                !pairing ||
                pairing.generation !== this._generation ||
                Date.parse(pairing.expiresAt) <= this._dependencies.clock.now()
            ) {
                this._pairings.delete(hash);
                throw new RemoteProtocolError(
                    'expired',
                    'The pairing challenge is invalid or expired.',
                );
            }
            if (
                pairing.attemptId &&
                (pairing.attemptId !== request.attemptId ||
                    pairing.deviceName !== request.deviceName ||
                    pairing.credentialMode !== request.credentialMode)
            ) {
                throw new RemoteProtocolError(
                    'consumed',
                    'This challenge already belongs to another pairing attempt.',
                );
            }
            if (!pairing.attemptId) {
                pairing.attemptId = request.attemptId;
                pairing.deviceName = request.deviceName;
                pairing.credentialMode = request.credentialMode;
                pairing.pairingId = this._dependencies.security.randomToken(24);
            }
            if (pairing.grant) return pairing.grant;
            if ((this._dependencies.pairingPolicy ?? 'qr-possession') === 'host-approval') {
                return {
                    status: 'pending',
                    pairingId: pairing.pairingId!,
                    expiresAt: pairing.expiresAt,
                };
            }
            return this.grant(pairing);
        });
    }
    /**
     * Approves a still-valid attempt when the application opts into host approval.
     *
     * @param pairingId - Opaque consumed-attempt identifier from the sanitized host-administration state.
     * @returns Resolves after the device grant is committed. The client receives it by retrying the same pairing attempt.
     * @public
     */
    public approvePairing(pairingId: string): Promise<void> {
        return this.serialize(async () => {
            this.requireEnabled();
            this.prune();
            const pairing = [...this._pairings.values()].find(
                (candidate) => candidate.pairingId === pairingId,
            );
            if (!pairing || pairing.grant || !pairing.attemptId) {
                throw new RemoteProtocolError(
                    'expired',
                    'The pairing request is no longer pending.',
                );
            }
            await this.grant(pairing);
        });
    }
    /**
     * Rejects an attempt and consumes its challenge.
     *
     * @param pairingId - Opaque consumed-attempt identifier from the sanitized host-administration state.
     * @returns Completes after the selected pending invitation is invalidated.
     * @public
     */
    public rejectPairing(pairingId: string): Promise<void> {
        return this.serialize(async () => {
            const entry = [...this._pairings.entries()].find(
                ([, pairing]) => pairing.pairingId === pairingId,
            );
            if (entry?.[1].grant)
                throw new RemoteProtocolError(
                    'consumed',
                    'This pairing attempt has already been approved.',
                );
            if (entry) this._pairings.delete(entry[0]);
        });
    }

    /**
     * Validates a credential without turning application reads into persistence writes.
     *
     * @param credential - Plaintext device bearer confined to the privileged runtime. Never project or log it.
     * @returns The authenticated device principal bound to this application and installation.
     * @public
     */
    public async authorize(credential: string): Promise<IRemotePrincipal> {
        await this._mutations;
        const state = this.requireEnabled();
        if (credential.length < 32 || credential.length > 256) {
            throw new RemoteProtocolError('unauthorized', 'A valid device session is required.');
        }
        const hash = this._dependencies.security.hashToken(credential);
        const device = state.devices.find((candidate) =>
            this._dependencies.security.equalDigest(candidate.tokenHash, hash),
        );
        if (!device)
            throw new RemoteProtocolError(
                'unauthorized',
                'The device session is no longer authorized.',
            );
        return Object.freeze({
            ...state.identity,
            deviceId: device.id,
            capabilities: device.capabilities,
        });
    }
    /**
     * Atomically revokes a device and notifies owned transports after durable commit.
     *
     * @param deviceId - Identifier of the device whose durable grant and owned streams must be revoked.
     * @returns Resolves after durable removal and synchronous revocation notification.
     * @throws RemoteProtocolError when the device is absent or persistence fails. Failed persistence leaves its grant active.
     * @public
     */
    public revokeDevice(deviceId: string): Promise<void> {
        return this.serialize(async () => {
            const state = this.requireState();
            if (!state.devices.some((device) => device.id === deviceId)) {
                throw new RemoteProtocolError(
                    'invalid-request',
                    'The paired device does not exist.',
                );
            }
            await this.commit({
                ...state,
                devices: state.devices.filter((device) => device.id !== deviceId),
            });
            for (const [key, pairing] of this._pairings) {
                if (
                    pairing.grant?.status === 'paired' &&
                    pairing.grant.principal.deviceId === deviceId
                )
                    this._pairings.delete(key);
            }
            this.emit({ kind: 'revoked', deviceId });
        });
    }
    /**
     * Revokes every durable device and every transient pairing.
     *
     * @returns Resolves after all durable grants are removed and their streams are canceled.
     * @public
     */
    public revokeAllDevices(): Promise<void> {
        return this.serialize(async () => {
            const state = this.requireState();
            const ids = state.devices.map((device) => device.id);
            await this.commit({ ...state, devices: [] });
            this.invalidatePendingPairings();
            for (const deviceId of ids) this.emit({ kind: 'revoked', deviceId });
        });
    }
    /**
     * Invalidates bootstrap material after network rebind, stop or process shutdown.
     *
     * @public
     */
    public invalidatePendingPairings(): void {
        this._generation++;
        this._pairings.clear();
        this.emit({ kind: 'pairings-invalidated' });
    }
    /**
     * Returns a sanitized administration projection.
     *
     * @returns A detached administration projection without plaintext credentials or digests.
     * @public
     */
    public getStatus(): IRemoteAccessStatus {
        const state = this.requireState();
        this.prune();
        return {
            enabled: state.enabled,
            devices: state.devices.map((device) => ({
                id: device.id,
                name: device.name,
                capabilities: [...device.capabilities],
                pairedAt: device.pairedAt,
                ...(device.lastSeenAt !== undefined ? { lastSeenAt: device.lastSeenAt } : {}),
            })),
            pendingPairings: [...this._pairings.values()]
                .filter((pairing) => pairing.pairingId && !pairing.grant)
                .map((pairing) => ({
                    id: pairing.pairingId!,
                    deviceName: pairing.deviceName!,
                    expiresAt: pairing.expiresAt,
                })),
        };
    }
    /**
     * Observes revocation/lifecycle effects. Unsubscribe before disposing a transport.
     *
     * @param listener - Observer invoked when authorization changes; the returned cleanup removes only this registration.
     * @returns An idempotent cleanup for this registration.
     * @public
     */
    public subscribe(listener: (event: RemoteAccessEvent) => void): () => void {
        this._listeners.add(listener);
        return () => {
            this._listeners.delete(listener);
        };
    }
    private async grant(pairing: IRemotePendingPairing): Promise<IRemotePairingGrant> {
        const state = this.requireEnabled();
        if (state.devices.length >= this._maxDevices)
            throw new RemoteProtocolError(
                'resource-limit',
                'The paired-device limit has been reached.',
            );
        const credential = this._dependencies.security.randomToken(32);
        const deviceId = this._dependencies.security.randomToken(24);
        const capabilities = [...new Set(this._dependencies.capabilities)];
        const device = {
            id: deviceId,
            name: pairing.deviceName!,
            tokenHash: this._dependencies.security.hashToken(credential),
            capabilities,
            pairedAt: new Date(this._dependencies.clock.now()).toISOString(),
        };
        await this.commit(
            remoteAccessStateSchema.parse({ ...state, devices: [...state.devices, device] }),
        );
        const grant: IRemotePairingGrant = {
            status: 'paired',
            pairingId: pairing.pairingId!,
            principal: { ...state.identity, deviceId, capabilities },
            credential,
            expiresAt: pairing.expiresAt,
        };
        pairing.grant = grant;
        return grant;
    }
    private requireState(): IRemoteAccessState {
        if (!this._state)
            throw new RemoteProtocolError('not-ready', 'Device authorization is not initialized.');
        return this._state;
    }
    private requireEnabled(): IRemoteAccessState {
        const state = this.requireState();
        if (!state.enabled)
            throw new RemoteProtocolError('unauthorized', 'Remote access is disabled.');
        return state;
    }
    private prune(): void {
        const now = this._dependencies.clock.now();
        for (const [key, pairing] of this._pairings)
            if (Date.parse(pairing.expiresAt) <= now) this._pairings.delete(key);
    }
    private async commit(state: IRemoteAccessState): Promise<void> {
        try {
            await this._dependencies.store.save(state);
        } catch {
            throw new RemoteProtocolError('persistence', 'Unable to persist device authorization.');
        }
        this._state = state;
    }
    private emit(event: RemoteAccessEvent): void {
        for (const listener of this._listeners) {
            // Observers cannot undo an already committed authorization change.
            try {
                listener(event);
            } catch {
                /* Transports must own their diagnostic failures. */
            }
        }
    }
    private serialize<T>(operation: () => Promise<T>): Promise<T> {
        const result = this._mutations.then(operation);
        this._mutations = result.then(
            () => undefined,
            () => undefined,
        );
        return result;
    }
    // #endregion
}
