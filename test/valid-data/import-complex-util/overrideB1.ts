/**
 * 'Override' Implementation #2 - type-fest's 'OverrideProperties'
 * This meant to be imported in the file that uses it,
 * yet all utils it uses must stay in this same file
 */
export type OverrideB1<
    TOriginal,
    TOverride extends Partial<Record<keyof TOriginal, unknown>> & {
        [Key in keyof TOverride]: Key extends keyof TOriginal ? TOverride[Key] : never;
    },
> = Merge<TOriginal, TOverride>;

type SimpleMerge<Destination, Source> = {
    [Key in keyof Destination as Key extends keyof Source ? never : Key]: Destination[Key];
} & Source;

type Merge<Destination, Source> = Simplify<
    SimpleMerge<PickIndexSignature<Destination>, PickIndexSignature<Source>> &
        SimpleMerge<OmitIndexSignature<Destination>, OmitIndexSignature<Source>>
>;

type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};

type PickIndexSignature<ObjectType> = {
    [KeyType in keyof ObjectType as {} extends Record<KeyType, unknown> ? KeyType : never]: ObjectType[KeyType];
};

type OmitIndexSignature<ObjectType> = {
    [KeyType in keyof ObjectType as {} extends Record<KeyType, unknown> ? never : KeyType]: ObjectType[KeyType];
};
