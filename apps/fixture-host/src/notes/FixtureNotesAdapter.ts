// #region Imports
import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { IRemoteApplicationAdapter } from '@pixel-brewery/remote-node/host';
import {
    normalizeRemotePath,
    RemoteProtocolError,
    type IRemoteRequestContext,
} from '@pixel-brewery/remote-protocol';
import type { IFixtureNote } from './interfaces/IFixtureNote.js';
// #endregion

const noteSchema = z.strictObject({ text: z.string().trim().min(1).max(1000) });

/**
 * Independent notes product proving that remote access does not own application state or validators.
 *
 * @public
 */
export class FixtureNotesAdapter implements IRemoteApplicationAdapter {
    // #region Fields
    private readonly _notes = new Map<string, IFixtureNote>();
    // #endregion
    // #region Methods
    /**
     * Executes this fixture's list, create and delete operations through original HTTP streams.
     *
     * @param request - Original notes request containing the product-owned JSON or resource identifier.
     * @param response - Product response retaining normal HTTP status and JSON representation.
     * @param context - Scoped registered notes operation and authenticated device identity.
     * @returns Resolves after the notes response is completed.
     * @throws RemoteProtocolError for invalid input, an exhausted fixture note budget or an unknown operation.
     * @public
     */
    public async handle(
        request: IncomingMessage,
        response: ServerResponse,
        context: IRemoteRequestContext,
    ): Promise<void> {
        if (context.operationId === 'notes.list') {
            this.json(response, 200, { notes: [...this._notes.values()] });
            return;
        }
        if (context.operationId === 'notes.create') {
            const chunks: Buffer[] = [];
            let size = 0;
            for await (const chunk of request) {
                const data = Buffer.from(chunk as Uint8Array);
                size += data.byteLength;
                if (size > 8192)
                    throw new RemoteProtocolError(
                        'resource-limit',
                        'The note command is too large.',
                    );
                chunks.push(data);
            }
            let input: unknown;
            try {
                input = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
            } catch {
                throw new RemoteProtocolError('invalid-request', 'The note command must be JSON.');
            }
            const parsed = noteSchema.safeParse(input);
            if (!parsed.success)
                throw new RemoteProtocolError(
                    'invalid-request',
                    'The note must contain one through one thousand characters.',
                );
            if (this._notes.size >= 1000)
                throw new RemoteProtocolError(
                    'resource-limit',
                    'The fixture note limit has been reached.',
                );
            const note: IFixtureNote = { id: randomUUID(), text: parsed.data.text };
            this._notes.set(note.id, note);
            this.json(response, 201, note);
            return;
        }
        if (context.operationId === 'notes.remove') {
            const id = normalizeRemotePath(request.url!).split('/').at(-1)!;
            if (!this._notes.delete(id)) {
                this.json(response, 404, { error: 'note-not-found' });
                return;
            }
            response.writeHead(204).end();
            return;
        }
        throw new RemoteProtocolError('forbidden', 'The notes operation is not registered.');
    }

    private json(response: ServerResponse, status: number, value: unknown): void {
        response
            .writeHead(status, { 'Content-Type': 'application/json' })
            .end(JSON.stringify(value));
    }
    // #endregion
}
