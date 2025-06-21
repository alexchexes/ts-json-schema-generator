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
    public constructor(
        protected typeChecker: ts.TypeChecker,
        protected childNodeParser: NodeParser,
        protected rootFileNames: readonly string[],
        protected expose: Config["expose"],
    ) {}

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

        if (typeSymbol.flags & ts.SymbolFlags.Alias) {
            const aliasedSymbol = this.typeChecker.getAliasedSymbol(typeSymbol);

            const declaration = aliasedSymbol.declarations?.filter((n: ts.Declaration) => !invalidTypes[n.kind])[0];

            if (!declaration) {
                // fallback for bun.sh
                return new AnyType();
            }

            const type = this.childNodeParser.createType(declaration, this.createSubContext(node, context));

            // Look at the declaration that introduced the alias so we can check
            // whether it originated from a type-only import.
            const aliasDeclaration = typeSymbol.declarations?.[0];
            let typeOnly = false;
            let reExported = false;
            let parent: ts.Node | undefined = aliasDeclaration;
            while (parent) {
                if (ts.isImportDeclaration(parent)) {
                    // `import type` declarations are marked via `isTypeOnly` on the
                    // import clause in the AST.
                    typeOnly = !!parent.importClause?.isTypeOnly;
                    break;
                }
                if (ts.isImportEqualsDeclaration(parent)) {
                    // CommonJS style `import x = require(...)` can also be marked
                    // as type-only via `isTypeOnly`.
                    typeOnly = !!parent.isTypeOnly;
                    break;
                }
                parent = parent.parent;
            }

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

            if (!typeOnly && !reExported && this.expose !== "all" && !(aliasedSymbol.flags & ts.SymbolFlags.Value)) {
                if (
                    aliasDeclaration &&
                    ts.isImportSpecifier(aliasDeclaration) &&
                    (aliasDeclaration.propertyName?.text ?? aliasDeclaration.name.text) === aliasDeclaration.name.text
                ) {
                    // If the import did not explicitly rename the specifier and
                    // the symbol resolves to a type without a runtime value,
                    // treat it as type-only even if `import type` wasn't used
                    // when the original declaration's source file wasn't part
                    // of the program's root files (e.g. when using mainTsOnly).
                    const rootFileNames = this.rootFileNames;
                    const declSource = aliasedSymbol.declarations?.[0]?.getSourceFile().fileName;
                    if (declSource && !rootFileNames.includes(declSource)) {
                        typeOnly = true;
                    }
                }
            }

            if (typeOnly && !reExported && this.expose !== "all" && type instanceof DefinitionType) {
                // Inline type-only imports to avoid generating redundant
                // definitions in the output schema.
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
