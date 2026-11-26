/**
 * Bounded SSE event; products own interpretation and payload validation.
 * @public
 */
export interface IRemoteServerEvent {
    /**
     * Event type, or message when no explicit name is present.
     * @public
     */
    readonly type: string;
    /**
     * Joined data lines without implicit JSON parsing.
     * @public
     */
    readonly data: string;
    /**
     * Optional server event ID; replay is not assumed.
     * @public
     */
    readonly id?: string;
}
