import type { Merge } from "./overrideB2-merge";

/**
 * 'Override' Implementation #2 - type-fest's 'OverrideProperties'
 * This meant to be imported in the file that uses it,
 * and all utils used by this, must also must be imported, as well as their utils
 */
export type OverrideB2<
    TOriginal,
    TOverride extends Partial<Record<keyof TOriginal, unknown>> & {
        [Key in keyof TOverride]: Key extends keyof TOriginal ? TOverride[Key] : never;
    },
> = Merge<TOriginal, TOverride>;
