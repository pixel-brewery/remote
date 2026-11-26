/**
 * Defines an existing workflow continued after a confirmed dependency merge.
 * @public
 */
export interface IDependabotPostMergeWorkflow {
    /**
     * Workflow filename under the repository's workflow directory.
     * @public
     */
    readonly file: string;

    /**
     * Optional changed-file prefixes that select this continuation.
     * @public
     */
    readonly paths?: readonly string[];

    /**
     * Workflow input receiving the exact merged source SHA.
     * @public
     */
    readonly inputKey?: string;
}
