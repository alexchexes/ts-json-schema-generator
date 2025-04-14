// part of OverrideB2 which is type-fest's 'OverrideProperties'

import type { Simplify } from "./overrideB2-simplify";

export type Merge<Destination, Source> = Simplify<
    SimpleMerge<PickIndexSignature<Destination>, PickIndexSignature<Source>> &
        SimpleMerge<OmitIndexSignature<Destination>, OmitIndexSignature<Source>>
>;

type SimpleMerge<Destination, Source> = {
    [Key in keyof Destination as Key extends keyof Source ? never : Key]: Destination[Key];
} & Source;

type PickIndexSignature<ObjectType> = {
    [KeyType in keyof ObjectType as {} extends Record<KeyType, unknown> ? KeyType : never]: ObjectType[KeyType];
};
type OmitIndexSignature<ObjectType> = {
    [KeyType in keyof ObjectType as {} extends Record<KeyType, unknown> ? never : KeyType]: ObjectType[KeyType];
};
