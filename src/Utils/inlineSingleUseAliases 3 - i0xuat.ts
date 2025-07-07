import type { JSONSchema7Definition } from "json-schema";
import type { Definition } from "../Schema/Definition.js";
import type { StringMap } from "./StringMap.js";
import { decodeRef, isLocalRef } from "./decodeRef.js";

function walk(
    def: Definition | JSONSchema7Definition | undefined,
    cb: (name: string) => void,
    visited: Set<any>,
): void {
    if (!def || typeof def !== "object" || visited.has(def)) {
        return;
    }
    visited.add(def);

    if (def.$ref && isLocalRef(def.$ref)) {
        const name = decodeRef(def.$ref);
        if (name) {
            cb(name);
        }
        return;
    }

    if (Array.isArray(def.anyOf)) {
        for (const d of def.anyOf) {
            walk(d, cb, visited);
        }
    }
    if (Array.isArray(def.allOf)) {
        for (const d of def.allOf) {
            walk(d, cb, visited);
        }
    }
    if (Array.isArray(def.oneOf)) {
        for (const d of def.oneOf) {
            walk(d, cb, visited);
        }
    }
    if (def.not) {
        walk(def.not, cb, visited);
    }
    if (def.then) {
        walk(def.then, cb, visited);
    }

    const type = def.type;
    if (Array.isArray(type) ? type.includes("object") : type === "object") {
        const props = def.properties;
        if (props) {
            for (const key of Object.keys(props)) {
                walk(props[key], cb, visited);
            }
        }
        const additional = def.additionalProperties;
        if (additional && typeof additional === "object") {
            walk(additional, cb, visited);
        }
    } else if (Array.isArray(type) ? type.includes("array") : type === "array") {
        const items = def.items;
        if (Array.isArray(items)) {
            for (const item of items) {
                walk(item, cb, visited);
            }
        } else if (items) {
            walk(items, cb, visited);
        }
    }
}

function replaceRefs(
    def: Definition | JSONSchema7Definition | undefined,
    target: string,
    replacement: Definition,
    visited: Set<any> = new Set(),
): void {
    if (!def || typeof def !== "object" || visited.has(def)) {
        return;
    }
    visited.add(def);

    if (def.$ref && isLocalRef(def.$ref)) {
        if (decodeRef(def.$ref) === target) {
            const clone = structuredClone(replacement);
            for (const key of Object.keys(def)) {
                delete (def as any)[key];
            }
            Object.assign(def, clone);
        }
        return;
    }

    if (Array.isArray(def.anyOf)) {
        for (const d of def.anyOf) {
            replaceRefs(d, target, replacement, visited);
        }
    }
    if (Array.isArray(def.allOf)) {
        for (const d of def.allOf) {
            replaceRefs(d, target, replacement, visited);
        }
    }
    if (Array.isArray(def.oneOf)) {
        for (const d of def.oneOf) {
            replaceRefs(d, target, replacement, visited);
        }
    }
    if (def.not) {
        replaceRefs(def.not, target, replacement, visited);
    }
    if (def.then) {
        replaceRefs(def.then, target, replacement, visited);
    }

    const type = def.type;
    if (Array.isArray(type) ? type.includes("object") : type === "object") {
        const props = def.properties;
        if (props) {
            for (const key of Object.keys(props)) {
                replaceRefs(props[key], target, replacement, visited);
            }
        }
        const additional = def.additionalProperties;
        if (additional && typeof additional === "object") {
            replaceRefs(additional, target, replacement, visited);
        }
    } else if (Array.isArray(type) ? type.includes("array") : type === "array") {
        const items = def.items;
        if (Array.isArray(items)) {
            for (const item of items) {
                replaceRefs(item, target, replacement, visited);
            }
        } else if (items) {
            replaceRefs(items, target, replacement, visited);
        }
    }
}

export function inlineSingleUseAliases(root: Definition | undefined, definitions: StringMap<Definition>): void {
    const counts = new Map<string, number>();
    const visited = new Set<any>();
    const counter = (name: string) => {
        counts.set(name, (counts.get(name) || 0) + 1);
    };

    if (root) {
        walk(root, counter, visited);
    }
    for (const def of Object.values(definitions)) {
        walk(def, counter, visited);
    }

    const inlineNames = Object.keys(definitions).filter(
        (n) => counts.get(n) === 1 && /(alias-|object-|structure-|indexed-type-)/.test(n),
    );

    for (const name of inlineNames) {
        const rep = definitions[name];
        if (!rep) continue;
        if (root) {
            replaceRefs(root, name, rep);
        }
        for (const def of Object.values(definitions)) {
            replaceRefs(def, name, rep);
        }
        delete definitions[name];
    }
}
