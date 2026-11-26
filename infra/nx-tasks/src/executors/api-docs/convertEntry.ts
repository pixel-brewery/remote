// #region Imports

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import ts from 'typescript';
import {
    Application,
    normalizePath,
    ReflectionKind,
    resetReflectionID,
    TSConfigReader,
    type TypeDocOptions,
} from 'typedoc';
import { MemberRouter, type PluginOptions } from 'typedoc-plugin-markdown';
import type { IEntryOptions } from './interfaces/IEntryOptions.js';

// #endregion

/**
 * Renders one public import path and checks the reflection against TypeScript's export list.
 *
 * @param entry - Source entry point, TypeScript project and generated output paths.
 * @returns Linkable exported symbols for the API index.
 * @throws When conversion, documentation validation or export coverage fails.
 *
 * @public
 */
export async function convertEntry(
    entry: IEntryOptions,
): Promise<readonly { name: string; kind: string; link: string }[]> {
    const config = ts.readConfigFile(entry.config, ts.sys.readFile);
    if (config.error)
        throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dirname(entry.config));
    if (parsed.errors.length)
        throw new Error(ts.flattenDiagnosticMessageText(parsed.errors[0]!.messageText, '\n'));
    const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options });
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(entry.source);
    const module = source && checker.getSymbolAtLocation(source);
    if (!module) throw new Error(`TypeScript could not load the module ${entry.importPath}.`);
    const expected = checker
        .getExportsOfModule(module)
        .map((symbol) => symbol.name)
        .sort();

    resetReflectionID();
    const options: TypeDocOptions & Partial<PluginOptions> = {
        entryPoints: [entry.source],
        tsconfig: entry.config,
        name: entry.importPath,
        outputs: [{ name: 'markdown', path: join(entry.staging, entry.markdown) }],
        plugin: ['typedoc-plugin-markdown'],
        router: 'member',
        entryFileName: 'index',
        readme: 'none',
        hideGenerator: true,
        hidePageHeader: true,
        hideBreadcrumbs: true,
        disableGit: true,
        disableSources: true,
        excludePrivate: true,
        excludeInternal: true,
        excludeExternals: true,
        requiredToBeDocumented: [
            'Class',
            'Constructor',
            'Interface',
            'TypeAlias',
            'Function',
            'Method',
            'Property',
            'Accessor',
            'Variable',
        ],
        validation: {
            notDocumented: true,
            notExported: true,
            invalidLink: true,
            invalidPath: true,
        },
        treatWarningsAsErrors: true,
        treatValidationWarningsAsErrors: true,
        sort: ['alphabetical'],
        logLevel: 'Warn',
    };
    const app = await Application.bootstrapWithPlugins(options, [new TSConfigReader()]);
    const project = await app.convert();
    if (!project) throw new Error(`TypeDoc could not convert ${entry.importPath}.`);

    app.validate(project);
    const actual = (project.children ?? []).map((symbol) => symbol.name).sort();
    if (actual.join('\n') !== expected.join('\n')) {
        throw new Error(
            `API export coverage differs for ${entry.importPath}. Expected [${expected}], documented [${actual}].`,
        );
    }
    if (app.logger.hasErrors() || app.logger.hasWarnings() || app.logger.validationWarningCount) {
        throw new Error(`API documentation validation failed for ${entry.importPath}.`);
    }

    const router = new MemberRouter(app);
    router.buildPages(project);
    const entries = (project.children ?? []).map((symbol) => ({
        name: symbol.name,
        kind: ReflectionKind.singularString(symbol.kind),
        link: `${entry.markdown}/${router.getFullUrl(symbol)}`,
    }));
    await app.generateOutputs(project);
    if (app.logger.hasErrors() || app.logger.hasWarnings()) {
        throw new Error(`API documentation rendering failed for ${entry.importPath}.`);
    }

    const reflectionFile = join(entry.staging, entry.reflection);
    await mkdir(dirname(reflectionFile), { recursive: true });
    const reflection = app.serializer.projectToObject(project, normalizePath(entry.root));
    await writeFile(reflectionFile, `${JSON.stringify(reflection, null, 2)}\n`);

    return entries;
}
