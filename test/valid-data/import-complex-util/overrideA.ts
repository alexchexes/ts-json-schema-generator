/**
 * 'Override' Implementation #1
 */
export type OverrideA<TBase, TOverride extends { [K in keyof TOverride]: K extends keyof TBase ? unknown : never }> = {
    [K in keyof TBase as K extends keyof TOverride ? never : K]: TBase[K]; // keep everything except overrides
} & {
    [K in keyof TOverride]: K extends keyof TBase
        ? K extends OptionalKeys<TBase> // preserve optionality
            ? TOverride[K] | undefined
            : TOverride[K]
        : never;
};

// Extracts keys from TBase that are optional (i.e., may be omitted)
type OptionalKeys<TBase> = {
    [K in keyof TBase]-?: {} extends Pick<TBase, K> ? K : never;
}[keyof TBase];
