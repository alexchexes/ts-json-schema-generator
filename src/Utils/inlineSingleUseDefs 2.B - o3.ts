import type { JSONSchema7Definition } from "json-schema";
import type { Definition } from "../Schema/Definition.js";
import type { StringMap } from "./StringMap.js";
import { decodeRef, isLocalRef } from "./decodeRef.js";

/** Names that ts-json-schema-generator auto-creates */
const GENERATED_NAME = /^(alias|object|structure|indexed-type)-/i;

/* ------------------------------------------------------------------ *
 *  Generic visitor
 * ------------------------------------------------------------------ */

/**
 * Recursively walks a JSON-schema node and its children.
 *
 * The `visitor` is called for **every** node.
 * If it returns `false`, traversal stops *for that branch* (used to avoid
 * descending into `$ref` objects we’re about to replace or count).
 */
type Visitor = (node: Definition | JSONSchema7Definition) => void | boolean;

function visitSchema(
    def: Definition | JSONSchema7Definition | undefined,
    visitor: Visitor,
    visited: Set<any> = new Set(),
): void {
    if (!def || typeof def !== "object" || visited.has(def)) return;
    visited.add(def);

    // if visitor explicitly returns false → do not traverse children
    if (visitor(def) === false) return;

    /* combinators --------------------------------------------------- */
    if (Array.isArray(def.anyOf)) for (const d of def.anyOf) visitSchema(d, visitor, visited);
    if (Array.isArray(def.allOf)) for (const d of def.allOf) visitSchema(d, visitor, visited);
    if (Array.isArray(def.oneOf)) for (const d of def.oneOf) visitSchema(d, visitor, visited);
    if (def.not) visitSchema(def.not, visitor, visited);

    /* conditional branches ------------------------------------------ */
    if (def.then) visitSchema(def.then, visitor, visited);
    if (def.if) visitSchema(def.if, visitor, visited);
    if (def.else) visitSchema(def.else, visitor, visited);

    /* objects ------------------------------------------------------- */
    const type = def.type;
    const isObj = Array.isArray(type) ? type.includes("object") : type === "object";
    const isArray = Array.isArray(type) ? type.includes("array") : type === "array";

    if (isObj) {
        const { properties, additionalProperties, patternProperties } = def;

        if (properties) {
            for (const key of Object.keys(properties)) {
                visitSchema(properties[key], visitor, visited);
            }
        }

        if (patternProperties) {
            for (const key of Object.keys(patternProperties)) {
                visitSchema(patternProperties[key], visitor, visited);
            }
        }

        if (additionalProperties && typeof additionalProperties === "object") {
            visitSchema(additionalProperties, visitor, visited);
        }

        // JSON-Schema 2020-12+: propertyNames, unevaluatedProperties, etc.
        if (def.propertyNames) {
            visitSchema(def.propertyNames, visitor, visited);
        }
    }

    /* arrays -------------------------------------------------------- */
    if (isArray) {
        const { items, additionalItems } = def;

        if (Array.isArray(items)) {
            for (const it of items) {
                visitSchema(it, visitor, visited);
            }
        } else if (items) {
            visitSchema(items, visitor, visited);
        }

        if (additionalItems && typeof additionalItems === "object") {
            visitSchema(additionalItems, visitor, visited);
        }
    }
}

/* ------------------------------------------------------------------ *
 *  Counting phase
 * ------------------------------------------------------------------ */

function collectRefCounts(root: Definition | undefined, defs: StringMap<Definition>): Map<string, number> {
    const counts = new Map<string, number>();

    const counter: Visitor = (node) => {
        if (typeof node === "object" && node.$ref && isLocalRef(node.$ref)) {
            const name = decodeRef(node.$ref);
            if (name) {
                counts.set(name, (counts.get(name) || 0) + 1);
            }
            return false; // do **not** descend into this $ref
        }
        return;
    };

    if (root) {
        visitSchema(root, counter);
    }
    for (const def of Object.values(defs)) {
        visitSchema(def, counter);
    }

    return counts;
}

/* ------------------------------------------------------------------ *
 *  Replacement phase
 * ------------------------------------------------------------------ */

function inlineRefs(
    node: Definition | JSONSchema7Definition | undefined,
    replacees: Set<string>,
    definitions: StringMap<Definition>,
): void {
    const replacer: Visitor = (current) => {
        if (typeof current === "object" && current.$ref && isLocalRef(current.$ref)) {
            const name = decodeRef(current.$ref);
            if (name && replacees.has(name)) {
                const clone = structuredClone(definitions[name]);
                // mutate in place to preserve outer references
                for (const k of Object.keys(current)) {
                    delete (current as Record<string, any>)[k];
                }
                Object.assign(current, clone);
            }
            return false; // stop descent – a $ref has no nested children
        }
        return;
    };

    visitSchema(node, replacer);
}

/* ------------------------------------------------------------------ *
 *  Main entry point
 * ------------------------------------------------------------------ */

/**
 * Inlines autogenerated definitions that are referenced only once.
 * Returns the (possibly mutated) root definition and the modified definitions map.
 */
export function inlineSingleUseDefs(
    rootDef: Definition | undefined,
    defs: StringMap<Definition>,
): { rootDef: Definition | undefined; definitions: StringMap<Definition> } {
    // We loop until *no* more generated, single-use defs remain.
    // Termination is guaranteed because at least one entry in `defs`
    // is deleted in each iteration.
    while (true) {
        /* 1. count references -------------------------------------- */
        const counts = collectRefCounts(rootDef, defs);

        /* 2. prepare inlining set ---------------------------------- */
        const toInline = new Set<string>();
        for (const [name, count] of counts) {
            if (count === 1 && GENERATED_NAME.test(name) && Object.prototype.hasOwnProperty.call(defs, name)) {
                toInline.add(name);
            }
        }
        if (toInline.size === 0) {
            // ↪ finished
            break;
        }

        /* 3. replace every $ref ------------------------------------ */
        if (rootDef) {
            inlineRefs(rootDef, toInline, defs);
        }
        for (const def of Object.values(defs)) {
            inlineRefs(def, toInline, defs);
        }

        /* 4. delete the now-unused definitions --------------------- */
        for (const name of toInline) {
            delete defs[name];
        }
        // loop continues – another round may surface new single-use defs
    }

    return { rootDef, definitions: defs };
}
