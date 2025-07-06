import type { Definition } from "../Schema/Definition.js";
import type { StringMap } from "./StringMap.js";

const DEFINITION_PREFIX = "#/definitions/";

function decodeRef(ref: string): string | null {
    if (!ref.startsWith(DEFINITION_PREFIX)) {
        return null;
    }
    try {
        return decodeURIComponent(ref.slice(DEFINITION_PREFIX.length));
    } catch {
        return ref.slice(DEFINITION_PREFIX.length);
    }
}

function walk(def: Definition | boolean | undefined, cb: (name: string) => void, visited: Set<any>): void {
    if (!def || typeof def !== "object" || visited.has(def)) {
        return;
    }
    visited.add(def);

    if ("$ref" in def && typeof def.$ref === "string") {
        const name = decodeRef(def.$ref);
        if (name) {
            cb(name);
        }
        return;
    }

    if (Array.isArray((def as any).anyOf)) {
        for (const d of (def as any).anyOf as Definition[]) {
            walk(d, cb, visited);
        }
    }
    if (Array.isArray((def as any).allOf)) {
        for (const d of (def as any).allOf as Definition[]) {
            walk(d, cb, visited);
        }
    }
    if (Array.isArray((def as any).oneOf)) {
        for (const d of (def as any).oneOf as Definition[]) {
            walk(d, cb, visited);
        }
    }
    if ((def as any).not) {
        walk((def as any).not as Definition, cb, visited);
    }
    if ((def as any).then) {
        walk((def as any).then as Definition, cb, visited);
    }

    const type = (def as any).type;
    if ((Array.isArray(type) ? type.includes("object") : type === "object")) {
        const props = (def as any).properties;
        if (props) {
            for (const key of Object.keys(props)) {
                walk(props[key] as Definition, cb, visited);
            }
        }
        const additional = (def as any).additionalProperties;
        if (additional && typeof additional === "object") {
            walk(additional as Definition, cb, visited);
        }
    } else if (Array.isArray(type) ? type.includes("array") : type === "array") {
        const items = (def as any).items;
        if (Array.isArray(items)) {
            for (const item of items) {
                walk(item as Definition, cb, visited);
            }
        } else if (items) {
            walk(items as Definition, cb, visited);
        }
    }
}

function replaceRefs(
    def: Definition | boolean | undefined,
    target: string,
    replacement: Definition,
    visited: Set<any> = new Set(),
): void {
    if (!def || typeof def !== "object" || visited.has(def)) {
        return;
    }
    visited.add(def);

    if ("$ref" in def && typeof def.$ref === "string") {
        if (decodeRef(def.$ref) === target) {
            const clone = JSON.parse(JSON.stringify(replacement));
            for (const key of Object.keys(def)) {
                delete (def as any)[key];
            }
            Object.assign(def as any, clone);
        }
        return;
    }

    if (Array.isArray((def as any).anyOf)) {
        for (const d of (def as any).anyOf as Definition[]) {
            replaceRefs(d, target, replacement, visited);
        }
    }
    if (Array.isArray((def as any).allOf)) {
        for (const d of (def as any).allOf as Definition[]) {
            replaceRefs(d, target, replacement, visited);
        }
    }
    if (Array.isArray((def as any).oneOf)) {
        for (const d of (def as any).oneOf as Definition[]) {
            replaceRefs(d, target, replacement, visited);
        }
    }
    if ((def as any).not) {
        replaceRefs((def as any).not as Definition, target, replacement, visited);
    }
    if ((def as any).then) {
        replaceRefs((def as any).then as Definition, target, replacement, visited);
    }

    const type = (def as any).type;
    if ((Array.isArray(type) ? type.includes("object") : type === "object")) {
        const props = (def as any).properties;
        if (props) {
            for (const key of Object.keys(props)) {
                replaceRefs(props[key] as Definition, target, replacement, visited);
            }
        }
        const additional = (def as any).additionalProperties;
        if (additional && typeof additional === "object") {
            replaceRefs(additional as Definition, target, replacement, visited);
        }
    } else if (Array.isArray(type) ? type.includes("array") : type === "array") {
        const items = (def as any).items;
        if (Array.isArray(items)) {
            for (const item of items) {
                replaceRefs(item as Definition, target, replacement, visited);
            }
        } else if (items) {
            replaceRefs(items as Definition, target, replacement, visited);
        }
    }
}

export function inlineSingleUseAliases(
    root: Definition | undefined,
    definitions: StringMap<Definition>,
): void {
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
        (n) => counts.get(n) === 1 && /(alias-|object-|structure-)/.test(n),
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

