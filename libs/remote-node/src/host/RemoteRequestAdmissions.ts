// #region Imports
import type { IRemoteRequestContext } from '@pixel-brewery/remote-protocol';
// #endregion

/**
 * Records non-forgeable provenance of requests admitted by the remote host, inside one process.
 *
 * @remarks
 * No header, cookie or request property grants this provenance: only the exact
 * request object passed to {@link RemoteRequestAdmissions.admit} is recognized,
 * so application gates can distinguish SDK-admitted device requests from local
 * callers. An admission is live until its release runs or its context signal
 * aborts. Entries are held weakly and never extend a request's lifetime.
 *
 * @public
 */
export class RemoteRequestAdmissions {
    // #region Fields
    private readonly _requests = new WeakMap<object, IRemoteRequestContext>();
    // #endregion

    // #region Methods
    /**
     * Admits one SDK-authorized request until its response or owned work ends.
     *
     * @param request - Original request object passed on to the application pipeline.
     * @param context - Authenticated device, registered operation and cancellation scope.
     * @returns Idempotent release removing only this admission; a later admission of the same
     * request survives the release of an earlier one.
     *
     * @public
     */
    public admit(request: object, context: IRemoteRequestContext): () => void {
        this._requests.set(request, context);
        return () => {
            if (this._requests.get(request) === context) this._requests.delete(request);
        };
    }

    /**
     * Tests provenance without trusting any caller-supplied header or property.
     *
     * @param request - Request currently entering an application gate.
     * @returns True only for a live, unreleased and unaborted admission of this exact object.
     *
     * @public
     */
    public has(request: object): boolean {
        return this.context(request) !== undefined;
    }

    /**
     * Reads the device context of a live admission.
     *
     * @param request - Request currently entering an application gate.
     * @returns The admitted context, or undefined when the request was never admitted, was released
     * or its signal aborted.
     *
     * @public
     */
    public context(request: object): IRemoteRequestContext | undefined {
        const context = this._requests.get(request);
        return context !== undefined && !context.signal.aborted ? context : undefined;
    }
    // #endregion
}
