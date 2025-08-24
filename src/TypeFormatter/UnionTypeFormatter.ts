import type { JSONSchema7 } from "json-schema";
import type { Definition } from "../Schema/Definition.js";
import type { SubTypeFormatter } from "../SubTypeFormatter.js";
import type { BaseType } from "../Type/BaseType.js";
import { LiteralType } from "../Type/LiteralType.js";
import { NeverType } from "../Type/NeverType.js";
import { UnionType } from "../Type/UnionType.js";
import type { TypeFormatter } from "../TypeFormatter.js";
import { derefType } from "../Utils/derefType.js";
import { getTypeByKey } from "../Utils/typeKeys.js";
import { uniqueArray } from "../Utils/uniqueArray.js";
import { JsonTypeError } from "../Error/Errors.js";

type DiscriminatorType = "json-schema" | "open-api";

export class UnionTypeFormatter implements SubTypeFormatter {
    public constructor(
        protected childTypeFormatter: TypeFormatter,
        private discriminatorType?: DiscriminatorType,
    ) {}

    public supportsType(type: BaseType): boolean {
        return type instanceof UnionType;
    }
    private getTypeDefinitions(type: UnionType) {
        return type
            .getTypes()
            .filter((item) => !(derefType(item) instanceof NeverType))
            .map((item) => this.childTypeFormatter.getDefinition(item));
    }

    private getJsonSchemaDiscriminatorDefinition(type: UnionType): Definition {
        const definitions = this.getTypeDefinitions(type);
        const discriminator = type.getDiscriminator();

        if (!discriminator) {
            throw new JsonTypeError("discriminator is undefined", type);
        }

        const kindTypes = type
            .getTypes()
            .filter((item) => !(derefType(item) instanceof NeverType))
            .map((item) => getTypeByKey(item, new LiteralType(discriminator)));

        const undefinedIndex = kindTypes.findIndex((item) => item === undefined);

        if (undefinedIndex !== -1) {
            throw new JsonTypeError(
                `Cannot find discriminator keyword "${discriminator}" in type ${type.getTypes()[undefinedIndex].getName()}.`,
                type,
            );
        }

        const kindDefinitions = kindTypes.map((item) => this.childTypeFormatter.getDefinition(item as BaseType));

        const allOf = [];

        for (let i = 0; i < definitions.length; i++) {
            allOf.push({
                if: {
                    properties: { [discriminator]: kindDefinitions[i] },
                },
                then: definitions[i],
            });
        }

        const kindValues = kindDefinitions
            .flatMap((item) => item.const ?? item.enum)
            .filter((item): item is string | number | boolean | null => item !== undefined);

        const duplicates = kindValues.filter((item, index) => kindValues.indexOf(item) !== index);
        if (duplicates.length > 0) {
            throw new JsonTypeError(
                `Duplicate discriminator values: ${duplicates.join(", ")} in type ${JSON.stringify(type.getName())}.`,
                type,
            );
        }

        const properties = {
            [discriminator]: {
                enum: kindValues,
            },
        };

        return { type: "object", properties, required: [discriminator], allOf };
    }
    private getOpenApiDiscriminatorDefinition(type: UnionType): Definition {
        const oneOf = this.getTypeDefinitions(type);
        const discriminator = type.getDiscriminator();

        if (!discriminator) {
            throw new JsonTypeError("discriminator is undefined", type);
        }

        return {
            type: "object",
            discriminator: { propertyName: discriminator },
            required: [discriminator],
            oneOf,
        } as JSONSchema7;
    }
    public getDefinition(type: UnionType): Definition {
        const discriminator = type.getDiscriminator();
        if (discriminator !== undefined) {
            if (this.discriminatorType === "open-api") return this.getOpenApiDiscriminatorDefinition(type);
            return this.getJsonSchemaDiscriminatorDefinition(type);
        }

        const definitions = this.getTypeDefinitions(type);

        const flattenedDefinitions: JSONSchema7[] = [];

        // Flatten anyOf inside anyOf unless the anyOf has an annotation
        for (const def of definitions) {
            const keys = Object.keys(def);

            if (keys.length === 1 && keys[0] === "anyOf") {
                flattenedDefinitions.push(...(def.anyOf as any));
            } else {
                flattenedDefinitions.push(def);
            }
        }
        if (flattenedDefinitions.length > 1) {
            const merged = this.tryMergeEnums(flattenedDefinitions);
            if (merged) {
                return merged;
            }
            return {
                anyOf: flattenedDefinitions,
            };
        }

        return flattenedDefinitions[0];
    }
    public getChildren(type: UnionType): BaseType[] {
        return uniqueArray(
            type
                .getTypes()
                .reduce((result: BaseType[], item) => [...result, ...this.childTypeFormatter.getChildren(item)], []),
        );
    }

    private tryMergeEnums(defs: JSONSchema7[]): Definition | undefined {
        if (defs.some((d) => "$ref" in d)) {
            return undefined;
        }

        const firstType = defs[0].type;
        if (typeof firstType !== "string") {
            return undefined;
        }

        const values: (string | number | boolean | null)[] = [];

        for (const def of defs) {
            if (def.type !== firstType) {
                return undefined;
            }

            const keys = Object.keys(def);
            if (keys.some((k) => k !== "type" && k !== "enum" && k !== "const")) {
                return undefined;
            }

            if (def.const !== undefined) {
                if (!values.includes(def.const as any)) {
                    values.push(def.const as any);
                }
            } else if (Array.isArray(def.enum)) {
                for (const v of def.enum) {
                    if (!values.includes(v as any)) {
                        values.push(v as any);
                    }
                }
            } else {
                return undefined;
            }
        }

        return { type: firstType, enum: values };
    }
}
