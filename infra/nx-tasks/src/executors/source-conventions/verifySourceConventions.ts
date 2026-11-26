// #region Imports
import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { basename, dirname, join, relative, sep } from 'node:path';
import { promisify } from 'node:util';
import ts from 'typescript';
// #endregion

/**
 * Verifies source placement, public comment contracts and actual Git path casing.
 *
 * @remarks TypeDoc separately checks reflected API coverage. This check enforces
 * source conventions and cannot establish that a comment describes behavior
 * accurately; the task's semantic review still owns that responsibility.
 *
 * @param root - Workspace whose authored TypeScript sources are checked.
 * @param indexedPaths - Optional index inventory for isolated verifier tests.
 * Production calls read the actual index with Git.
 * @returns The number of production source files checked.
 * @throws An error listing invalid locations, documentation or index casing.
 *
 * @public
 */
export async function verifySourceConventions(
    root: string,
    indexedPaths?: readonly string[],
): Promise<number> {
    const files: string[] = [];
    const failures: string[] = [];
    async function visit(directory: string): Promise<void> {
        const entries = await readdir(directory, { withFileTypes: true }).catch(
            (error: unknown) => {
                if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
                throw error;
            },
        );
        for (const entry of entries) {
            if (
                ['node_modules', 'dist', 'build', '.gradle', '.build', 'coverage'].includes(
                    entry.name,
                )
            )
                continue;
            const path = join(directory, entry.name);
            if (entry.isDirectory()) await visit(path);
            else if (
                entry.isFile() &&
                entry.name.endsWith('.ts') &&
                !/\.(spec|test|d)\.ts$/.test(entry.name)
            )
                files.push(path);
        }
    }
    for (const scope of ['libs', 'apps', 'infra']) await visit(join(root, scope));
    const paths = files.map((file) => relative(root, file).split(sep).join('/'));
    const inventory = new Map(paths.map((path) => [path.toLowerCase(), path]));
    for (const path of paths) {
        const segments = path.split('/');
        if (segments.slice(0, -1).some((part) => part !== part.toLowerCase()))
            failures.push(`${path}: source directories must be lowercase.`);
        if (/\/src\/lib\/[^/]+\.ts$/.test(path))
            failures.push(`${path}: place implementation in its cohesive feature directory.`);
    }
    const indexed =
        indexedPaths ??
        (
            await promisify(execFile)('git', ['ls-files', '-z', '--', 'libs', 'apps', 'infra'], {
                cwd: root,
            })
        ).stdout.split('\0');
    for (const path of indexed) {
        const actual = inventory.get(path.toLowerCase());
        if (actual && path !== actual)
            failures.push(`${path}: Git index casing differs from filesystem path ${actual}.`);
    }

    for (const file of files) {
        const path = relative(root, file).split(sep).join('/');
        const text = await readFile(file, 'utf8');
        const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
        const fail = (node: ts.Node, message: string): void => {
            const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
            failures.push(`${path}:${line}: ${message}`);
        };
        if (
            source.statements.some(ts.isImportDeclaration) &&
            !text.trimStart().startsWith('// #region Imports')
        )
            fail(source, 'Wrap the initial import block in its Imports region.');
        let exports = 0;
        for (const statement of source.statements) {
            if (
                !hasModifier(statement, ts.SyntaxKind.ExportKeyword) ||
                ts.isExportDeclaration(statement)
            )
                continue;
            const declarations = ts.isVariableStatement(statement)
                ? statement.declarationList.declarations
                : [statement];
            exports += declarations.length;
            for (const declaration of declarations) {
                const name =
                    'name' in declaration &&
                    declaration.name &&
                    ts.isIdentifier(declaration.name as ts.Node)
                        ? (declaration.name as ts.Identifier).text
                        : undefined;
                if (
                    name &&
                    basename(file) !== `${name}.ts` &&
                    basename(file) !== 'executor.ts' &&
                    !hasModifier(statement, ts.SyntaxKind.DefaultKeyword)
                )
                    fail(declaration, `Filename must match public declaration ${name}.`);
            }
            checkComment(statement, true);
        }
        if (exports > 1)
            fail(
                source,
                'Keep one public declaration per implementation file; entry-point barrels re-export their owners.',
            );

        function checkComment(node: ts.Node, accessTag: boolean): void {
            const comment = ts
                .getJSDocCommentsAndTags(node)
                .find((value): value is ts.JSDoc => value.kind === ts.SyntaxKind.JSDocComment);
            if (!comment) {
                fail(node, 'Add multiline TSDoc for this public contract.');
                return;
            }
            const raw = comment.getText(source);
            if (!raw.includes('\n') || !raw.startsWith('/**')) fail(node, 'Use multiline TSDoc.');
            if (accessTag && !/^\s*\*\s+@(public|protected|internal)\s*$/m.test(raw))
                fail(node, 'Place the declaration access tag on its own TSDoc line.');
            if (
                ts.isFunctionDeclaration(node) ||
                ts.isMethodDeclaration(node) ||
                ts.isMethodSignature(node) ||
                ts.isConstructorDeclaration(node)
            ) {
                for (const parameter of node.parameters) {
                    if (!ts.isIdentifier(parameter.name)) continue;
                    const name = parameter.name.text;
                    if (!new RegExp(`@param\\s+${name}\\s+-\\s+\\S`).test(raw))
                        fail(parameter, `Document @param ${name} - with its input contract.`);
                }
                if (
                    !ts.isConstructorDeclaration(node) &&
                    node.type &&
                    !['void', 'never'].includes(node.type.getText(source)) &&
                    !/@returns\s+\S/.test(raw)
                )
                    fail(node, 'Document the result with @returns.');
            }
        }
        function inspect(node: ts.Node): void {
            if (ts.isInterfaceDeclaration(node)) {
                if (basename(dirname(file)) !== 'interfaces')
                    fail(node, "Interfaces belong in the owning feature's interfaces/ directory.");
                if (basename(file) !== `${node.name.text}.ts`)
                    fail(node, 'Each interface owns its matching source file.');
                for (const member of node.members) checkComment(member, true);
            }
            if (ts.isClassDeclaration(node)) {
                if (
                    hasModifier(node, ts.SyntaxKind.AbstractKeyword) &&
                    basename(dirname(file)) !== 'abstracts'
                )
                    fail(
                        node,
                        "Abstract classes belong in the owning feature's abstracts/ directory.",
                    );
                for (const member of node.members) {
                    if (
                        hasModifier(member, ts.SyntaxKind.PrivateKeyword) ||
                        (member.name && ts.isPrivateIdentifier(member.name))
                    )
                        continue;
                    if (
                        !hasModifier(member, ts.SyntaxKind.PublicKeyword) &&
                        !hasModifier(member, ts.SyntaxKind.ProtectedKeyword)
                    )
                        fail(member, 'Declare class member visibility explicitly.');
                    checkComment(member, true);
                }
            }
            ts.forEachChild(node, inspect);
        }
        inspect(source);
    }
    if (failures.length)
        throw new Error(
            `Source convention violations (${failures.length}):\n${failures.join('\n')}`,
        );
    return files.length;
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
    return (
        ts.canHaveModifiers(node) &&
        (ts.getModifiers(node)?.some((modifier) => modifier.kind === kind) ?? false)
    );
}
