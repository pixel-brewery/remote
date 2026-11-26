// #region Imports
import { builtinModules } from 'node:module';
import { posix } from 'node:path';
import ts from 'typescript';
import type { IPackedPackageDefinition } from './interfaces/IPackedPackageDefinition.js';
import type { IPackedPackageManifest } from './interfaces/IPackedPackageManifest.js';
// #endregion

/**
 * Checks dependency direction and portable boundaries in the shipped JavaScript and declarations.
 * @param definition - Owning SDK package and its inward dependency policy.
 * @param manifest - Actual published dependency metadata.
 * @param file - File path relative to its installed package.
 * @param text - Shipped JavaScript or declaration source.
 * @returns Completion after all static and literal dynamic imports satisfy their boundaries.
 * @throws An error for platform leakage, undeclared dependencies or escaping relative imports.
 * @public
 */
export function verifyPackedImports(
    definition: IPackedPackageDefinition,
    manifest: IPackedPackageManifest,
    file: string,
    text: string,
): void {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const builtins = new Set(
        builtinModules.flatMap((name) => [
            name,
            name.replace(/^node:/u, ''),
            'node:' + name.replace(/^node:/u, ''),
        ]),
    );
    const declared = {
        ...manifest.dependencies,
        ...manifest.optionalDependencies,
        ...manifest.peerDependencies,
    };
    const inspectSpecifier = (specifier: string): void => {
        if (specifier.includes('\\'))
            throw new Error(
                `${manifest.name}/${file}: import paths must use portable forward slashes.`,
            );
        if (specifier.startsWith('.')) {
            const target = posix.normalize(posix.join(posix.dirname(file), specifier));
            if (target === '..' || target.startsWith('../'))
                throw new Error(
                    `${manifest.name}/${file}: relative import escapes the packed owner.`,
                );
            return;
        }
        if (builtins.has(specifier)) {
            if (!definition.nodeImports)
                throw new Error(
                    `${manifest.name}/${file}: browser or portable SDK package imports Node ${specifier}.`,
                );
            return;
        }
        const name = specifier.startsWith('@')
            ? specifier.split('/').slice(0, 2).join('/')
            : specifier.split('/')[0];
        if (!name || !Object.hasOwn(declared, name))
            throw new Error(
                `${manifest.name}/${file}: undeclared or platform import ${specifier}.`,
            );
        if (definition.portable && name !== 'zod' && !definition.sdkDependencies.includes(name))
            throw new Error(
                `${manifest.name}/${file}: portable SDK package imports an external platform dependency.`,
            );
        if (name.startsWith('@pixel-brewery/remote-') && !definition.sdkDependencies.includes(name))
            throw new Error(
                `${manifest.name}/${file}: adapter dependency points outside the allowed SDK graph.`,
            );
    };
    for (const reference of source.typeReferenceDirectives) {
        if (!definition.nodeImports && reference.fileName === 'node')
            throw new Error(
                `${manifest.name}/${file}: browser or portable declarations reference Node types.`,
            );
    }
    const visit = (node: ts.Node): void => {
        if (
            (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
            node.moduleSpecifier &&
            ts.isStringLiteral(node.moduleSpecifier)
        )
            inspectSpecifier(node.moduleSpecifier.text);
        if (
            ts.isImportTypeNode(node) &&
            ts.isLiteralTypeNode(node.argument) &&
            ts.isStringLiteral(node.argument.literal)
        )
            inspectSpecifier(node.argument.literal.text);
        if (
            ts.isCallExpression(node) &&
            (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
                (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
        ) {
            const argument = node.arguments[0];
            if (argument && ts.isStringLiteral(argument)) inspectSpecifier(argument.text);
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
}
