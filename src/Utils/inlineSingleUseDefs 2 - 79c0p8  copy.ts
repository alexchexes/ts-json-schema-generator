import type { JSONSchema7Definition } from "json-schema";
import type { Definition } from "../Schema/Definition.js";
import type { StringMap } from "./StringMap.js";
import { decodeRef, isLocalRef } from "./decodeRef.js";

function collectRefs(def: Definition | JSONSchema7Definition, counts: Map<string, number>): void {
    if (typeof def === "boolean") {
        return;
    }
    if (def.$ref && isLocalRef(def.$ref)) {
        const name = decodeRef(def.$ref);
        if (name) {
            counts.set(name, (counts.get(name) || 0) + 1);
            return;
        }
    }

    if (def.anyOf) {
        for (const d of def.anyOf) {
            collectRefs(d, counts);
        }
    }
    if (def.allOf) {
        for (const d of def.allOf) {
            collectRefs(d, counts);
        }
    }
    if (def.oneOf) {
        for (const d of def.oneOf) {
            collectRefs(d, counts);
        }
    }
    if (def.not) {
        collectRefs(def.not, counts);
    }
    if (def.then) {
        collectRefs(def.then, counts);
    }

    const type = def.type;
    if (Array.isArray(type) ? type.includes("object") : type === "object") {
        if (def.properties) {
            for (const p of Object.values(def.properties)) {
                collectRefs(p, counts);
            }
        }
        if (def.additionalProperties && typeof def.additionalProperties === "object") {
            collectRefs(def.additionalProperties, counts);
        }
    }
    if (Array.isArray(type) ? type.includes("array") : type === "array") {
        if (Array.isArray(def.items)) {
            for (const it of def.items) {
                collectRefs(it, counts);
            }
        } else if (def.items) {
            collectRefs(def.items, counts);
        }
    }
}

function replaceRefs(
    def: Definition | JSONSchema7Definition,
    defs: StringMap<Definition>,
    inline: Set<string>,
): Definition | JSONSchema7Definition {
    if (typeof def === "boolean") {
        return def;
    }
    if (def.$ref && isLocalRef(def.$ref)) {
        const name = decodeRef(def.$ref);
        if (name && inline.has(name)) {
            const cloned = structuredClone(defs[name]);
            return replaceRefs(cloned, defs, inline);
        }
        return def;
    }

    if (def.anyOf) {
        def.anyOf = def.anyOf.map((d) => replaceRefs(d, defs, inline));
    }
    if (def.allOf) {
        def.allOf = def.allOf.map((d) => replaceRefs(d, defs, inline));
    }
    if (def.oneOf) {
        def.oneOf = def.oneOf.map((d) => replaceRefs(d, defs, inline));
    }
    if (def.not) {
        def.not = replaceRefs(def.not, defs, inline);
    }

    if (def.then) {
        def.then = replaceRefs(def.then, defs, inline);
    }

    const type = def.type;
    if (Array.isArray(type) ? type.includes("object") : type === "object") {
        if (def.properties) {
            for (const key of Object.keys(def.properties)) {
                def.properties[key] = replaceRefs(def.properties[key], defs, inline);
            }
        }
        if (def.additionalProperties && typeof def.additionalProperties === "object") {
            def.additionalProperties = replaceRefs(def.additionalProperties, defs, inline);
        }
    }
    if (Array.isArray(type) ? type.includes("array") : type === "array") {
        if (Array.isArray(def.items)) {
            def.items = def.items.map((i) => replaceRefs(i, defs, inline));
        } else if (def.items) {
            def.items = replaceRefs(def.items, defs, inline);
        }
    }
    return def;
}

export function inlineSingleUseDefs(
    rootDef: Definition | undefined,
    defs: StringMap<Definition>,
): { rootDef: Definition | undefined; definitions: StringMap<Definition> } {
    let changed = true;
    while (changed) {
        changed = false;
        const counts = new Map<string, number>();
        if (rootDef) {
            collectRefs(rootDef, counts);
        }
        for (const def of Object.values(defs)) {
            collectRefs(def, counts);
        }
        const toInline = new Set<string>();
        for (const [name, count] of counts) {
            const isGenerated =
                /^alias-/i.test(name) ||
                /^structure-/i.test(name) ||
                /^object-/i.test(name) ||
                /^indexed-type-/i.test(name);

            if (count === 1 && defs[name] && isGenerated) {
                toInline.add(name);
            }
        }
        if (toInline.size === 0) {
            break;
        }
        if (rootDef) {
            rootDef = replaceRefs(rootDef, defs, toInline) as Definition;
        }
        for (const key of Object.keys(defs)) {
            defs[key] = replaceRefs(defs[key], defs, toInline) as Definition;
        }
        for (const name of toInline) {
            delete defs[name];
        }
        changed = true;
    }

    return { rootDef, definitions: defs };
}
