const DEFINITION_PREFIX = "#/definitions/";

export function decodeRef(ref: string): string | null {
    if (!ref.startsWith(DEFINITION_PREFIX)) {
        return null;
    }
    try {
        return decodeURIComponent(ref.slice(DEFINITION_PREFIX.length));
    } catch {
        return ref.slice(DEFINITION_PREFIX.length);
    }
}

export function isLocalRef(ref: string): boolean {
    return ref.charAt(0) === "#";
}
