# TypeScript and API documentation

Each SDK library exposes its public declarations through `src/index.ts`. Keep one public declaration per source file. Place interfaces, models and runtime owners in the corresponding package directories. Keep framework-specific binding code in its adapter. The solution `tsconfig.json` references `tsconfig.lib.json`, which TypeDoc uses to resolve the same sources and dependency declarations as the build.

Group source by responsibility with lowercase directory names. Inside each feature, put every interface in `interfaces/` and every abstract class in `abstracts/`, regardless of nesting depth. For example, a connection transport contract belongs at `src/lib/connections/interfaces/IRemoteConnector.ts`; a pairing schema belongs to its pairing owner. Keep colocated specs beside the production file after relocation. Required native project conventions remain native-owned.

Group imports in `#region Imports`. In classes, order populated regions as `Fields`, `Ctor`, `Properties` and `Methods`. Declare member visibility explicitly. Within a region, order members by visibility and put static members ahead of instance members at the same visibility. Factory functions retain their lexical state and document their public contract.

Write English TSDoc for exported declarations and public or protected members. Describe required input, defaults, results, meaningful errors, and who owns cancellation and cleanup. Use `@param`, `@typeParam`, `@returns`, `@throws` and `@example` when they clarify the contract. Keep implementation-only declarations out of the package barrel.

Use multiline comments and put `@public` or `@protected` on its own line. Document interface properties and methods individually. Use TSDoc's `@param name - Description` syntax instead of JSDoc type annotations; TypeScript owns the types. Document observable behavior rather than repeating the symbol's name. The source-conventions check enforces placement and basic comment contracts; TypeDoc verifies the public reference, and a semantic review verifies the documented behavior.

When changing only directory case, rename through an intermediate path on case-insensitive filesystems. Verify the final names with the filesystem inventory and `git ls-files` before committing, then verify the committed tree. Git configuration is not a substitute for the correctly named paths.

## Generate and verify the reference

```sh
yarn docs
yarn docs:check
```

The Nx executor builds the SDK libraries, discovers their package exports and generates Markdown and JSON from TypeDoc 0.28.20 and typedoc-plugin-markdown 4.14.1. Conversion checks that the reflected declarations match TypeScript's exports. It validates documentation and verifies that each indexed destination exists.

TypeDoc and the export/AST inspection owners consume the published TypeScript API
compatibility package through the `typescript` npm alias. The workspace separately
uses native TypeScript 7.0.2 for its `tsc` build/typecheck commands and isolated
packed consumers. TypeScript 7.0 does not supply the legacy API these tools use;
keeping Microsoft's explicit compatibility package preserves strict documentation
validation without replacing the native compiler. See the
[compiler and API verification contract](testing.md#native-compiler-and-tooling-api)
for exact pins and executable checks.

- Package Markdown lives under `.docs/packages/<package>/api/`. Start from the [package reference links](../README.md#runtime-entry-points).
- [The API index](../api/api-index.json) lists packages, import paths, exports and their destinations. Links and reflection paths are relative to `.docs/`.
- The TypeDoc reflection for each package lives under `.docs/api/<package>/reflection.json`.

Edit the TypeScript source and regenerate the reference. The generator replaces its owned API directories after validation. `yarn docs:check` regenerates in a temporary directory and compares the result with the checkout. CI runs that check for source and documentation changes.
