import ts from "typescript";
import type { NodeParser } from "../NodeParser.js";
import type { Context } from "../NodeParser.js";
import type { SubNodeParser } from "../SubNodeParser.js";
import type { BaseType } from "../Type/BaseType.js";
import { AnyType } from "../Type/AnyType.js";

export class ParameterParser implements SubNodeParser {
    public constructor(
        protected typeChecker: ts.TypeChecker,
        protected childNodeParser: NodeParser,
    ) {}

    public supportsNode(node: ts.ParameterDeclaration): boolean {
        return node.kind === ts.SyntaxKind.Parameter;
    }
    public createType(node: ts.ParameterDeclaration, context: Context): BaseType {
        if (!node.type) {
            const inferredTypeNode = this.typeChecker.typeToTypeNode(
                this.typeChecker.getTypeAtLocation(node),
                node,
                ts.NodeBuilderFlags.NoTruncation,
            );

            if (inferredTypeNode) {
                return this.childNodeParser.createType(inferredTypeNode, context);
            }

            // Parameters without an explicit or inferred type default to `any`.
            return new AnyType();
        }

        return this.childNodeParser.createType(node.type, context);
    }
}
