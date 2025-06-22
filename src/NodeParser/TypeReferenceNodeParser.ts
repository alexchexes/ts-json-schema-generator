import ts from "typescript";
import { Context, type NodeParser } from "../NodeParser.js";
import type { SubNodeParser } from "../SubNodeParser.js";
import { AnnotatedType } from "../Type/AnnotatedType.js";
import { AnyType } from "../Type/AnyType.js";
import { ArrayType } from "../Type/ArrayType.js";
import type { BaseType } from "../Type/BaseType.js";
import { StringType } from "../Type/StringType.js";
import { UnknownType } from "../Type/UnknownType.js";
import { DefinitionType } from "../Type/DefinitionType.js";
import { symbolAtNode } from "../Utils/symbolAtNode.js";
import type { Config } from "../Config.js";

const invalidTypes: Record<number, boolean> = {
    [ts.SyntaxKind.ModuleDeclaration]: true,
    [ts.SyntaxKind.VariableDeclaration]: true,
};

export class TypeReferenceNodeParser implements SubNodeParser {
    protected readonly rootExports = new Set<ts.Symbol>();

    public constructor(
        protected typeChecker: ts.TypeChecker,
        protected childNodeParser: NodeParser,
        protected program: ts.Program,
        protected expose: Config["expose"],
    ) {
        // Collect all types exported from the root files even if their declarations are outside the root files
        for (const fileName of program.getRootFileNames()) {
            const sourceFile = program.getSourceFile(fileName);
            if (!sourceFile) {
                continue;
            }
            const moduleSymbol = this.typeChecker.getSymbolAtLocation(sourceFile);
            if (!moduleSymbol) {
                continue;
            }
            for (const exp of this.typeChecker.getExportsOfModule(moduleSymbol)) {
                const target = exp.flags & ts.SymbolFlags.Alias ? this.typeChecker.getAliasedSymbol(exp) : exp;
                this.rootExports.add(target);
            }
        }
    }

    public supportsNode(node: ts.TypeReferenceNode): boolean {
        return node.kind === ts.SyntaxKind.TypeReference;
    }

    public createType(node: ts.TypeReferenceNode, context: Context): BaseType {
        const typeSymbol =
            this.typeChecker.getSymbolAtLocation(node.typeName) ??
            // When the node doesn't have a valid source file, its position is -1, so we can't
            // search for a symbol based on its location. In that case, the ts.factory defines a symbol
            // property on the node itself.
            symbolAtNode(node.typeName)!;

        // check if the reference came from an `import`
        if (typeSymbol.flags & ts.SymbolFlags.Alias) {
            const aliasedSymbol = this.typeChecker.getAliasedSymbol(typeSymbol);

            const declaration = aliasedSymbol.declarations?.filter((n: ts.Declaration) => !invalidTypes[n.kind])[0];

            if (!declaration) {
                // fallback for bun.sh
                return new AnyType();
            }

            const type = this.childNodeParser.createType(declaration, this.createSubContext(node, context));

            // Look at the declaration that introduced the alias so we can check whether it
            // originated from a type-only import
            const aliasDeclaration = typeSymbol.declarations?.[0];
            let reExported = this.rootExports.has(aliasedSymbol);

            // Detect pure in-file rename aliases like `import Foo = Bar.Baz;`
            const localAlias =
                aliasDeclaration !== undefined &&
                ts.isImportEqualsDeclaration(aliasDeclaration) &&
                ts.isEntityName(aliasDeclaration.moduleReference);

            // If the alias came from an `import { Foo } from "..."`, check whether this source file
            // also re-exports the same symbol. A re-export means `Foo` became a part of the module's
            // public surface, so we keep a separate schema definition by forcing `reExported = true`.
            if (aliasDeclaration && ts.isImportSpecifier(aliasDeclaration)) {
                const moduleSymbol = this.typeChecker.getSymbolAtLocation(aliasDeclaration.getSourceFile());

                if (moduleSymbol) {
                    const moduleExports = this.typeChecker.getExportsOfModule(moduleSymbol);

                    for (const moduleExport of moduleExports) {
                        const targetSymbol =
                            moduleExport.flags & ts.SymbolFlags.Alias
                                ? this.typeChecker.getAliasedSymbol(moduleExport)
                                : moduleExport;

                        if (targetSymbol.name === aliasDeclaration.name.text) {
                            reExported = true;
                            break;
                        }
                    }
                }
            }

            // Inline private imports when they are not re-exported, not local aliases
            // and we are not exposing everything
            if (!localAlias && !reExported && this.expose !== "all" && type instanceof DefinitionType) {
                return type.getType();
            }

            return type;
        }

        if (typeSymbol.flags & ts.SymbolFlags.TypeParameter) {
            return context.getArgument(typeSymbol.name) ?? new UnknownType(true);
        }

        // Wraps promise type to avoid resolving to a empty Object type.
        if (typeSymbol.name === "Promise" || typeSymbol.name === "PromiseLike") {
            // Promise without type resolves to Promise<any>
            if (!node.typeArguments || node.typeArguments.length === 0) {
                return new AnyType();
            }

            return this.childNodeParser.createType(node.typeArguments[0], this.createSubContext(node, context));
        }

        if (typeSymbol.name === "Array" || typeSymbol.name === "ReadonlyArray") {
            const type = this.createSubContext(node, context).getArguments()[0];

            return type === undefined ? new AnyType() : new ArrayType(type);
        }

        if (typeSymbol.name === "Date") {
            return new AnnotatedType(new StringType(), { format: "date-time" }, false);
        }

        if (typeSymbol.name === "RegExp") {
            return new AnnotatedType(new StringType(), { format: "regex" }, false);
        }

        if (typeSymbol.name === "URL") {
            return new AnnotatedType(new StringType(), { format: "uri" }, false);
        }

        return this.childNodeParser.createType(
            typeSymbol.declarations!.filter((n: ts.Declaration) => !invalidTypes[n.kind])[0],
            this.createSubContext(node, context),
        );
    }

    protected createSubContext(node: ts.TypeReferenceNode, parentContext: Context): Context {
        const subContext = new Context(node);

        if (node.typeArguments?.length) {
            for (const typeArg of node.typeArguments) {
                subContext.pushArgument(this.childNodeParser.createType(typeArg, parentContext));
            }
        }

        return subContext;
    }
}
