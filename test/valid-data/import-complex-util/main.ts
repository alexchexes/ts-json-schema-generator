import type { OverrideA as ImportedOverrideA } from "./overrideA.ts";
import type { OverrideB1 as ImportedOverrideB1 } from "./overrideB1.ts";
import type { OverrideB2 as ImportedOverrideB2 } from "./overrideB2.ts";

interface SomeInterface {
    foo: string;
    bar: null;
}

// --------------------------
// Imported - Type
// --------------------------

export type TypeWithImportedOverrideA = ImportedOverrideA<
    SomeInterface,
    {
        bar: string;
    }
>;

export type TypeWithImportedOverrideB1 = ImportedOverrideB1<
    SomeInterface,
    {
        bar: string;
    }
>;

export type TypeWithImportedOverrideB2 = ImportedOverrideB2<
    SomeInterface,
    {
        bar: string;
    }
>;

// --------------------------
// Imported - Interface
// --------------------------

export interface InterfaceWithImportedOverrideA
    extends ImportedOverrideA<
        SomeInterface,
        {
            bar: string;
        }
    > {}

export interface InterfaceWithImportedOverrideB1
    extends ImportedOverrideB1<
        SomeInterface,
        {
            bar: string;
        }
    > {}

export interface InterfaceWithImportedOverrideB2
    extends ImportedOverrideB2<
        SomeInterface,
        {
            bar: string;
        }
    > {}

// --------------------------
// Same file - Type
// --------------------------

export type TypeWithOverrideA = OverrideA<
    SomeInterface,
    {
        bar: string;
    }
>;

export type TypeWithOverrideB2 = OverrideB<
    SomeInterface,
    {
        bar: string;
    }
>;

// --------------------------
// Same file - Interface
// --------------------------

export interface InterfaceWithOverrideA
    extends OverrideA<
        SomeInterface,
        {
            bar: string;
        }
    > {}

export interface InterfaceWithOverrideB
    extends OverrideB<
        SomeInterface,
        {
            bar: string;
        }
    > {}

// --------------------------
// Same file utils
// --------------------------

/**
 * 'Override' Implementation #1
 * This must stay in this same file which uses it
 */
type OverrideA<TBase, TOverride extends { [K in keyof TOverride]: K extends keyof TBase ? unknown : never }> = {
    [K in keyof TBase as K extends keyof TOverride ? never : K]: TBase[K]; // keep everything except overrides
} & {
    [K in keyof TOverride]: K extends keyof TBase
        ? K extends OptionalKeys<TBase> // preserve optionality
            ? TOverride[K] | undefined
            : TOverride[K]
        : never;
};
type OptionalKeys<TBase> = {
    [K in keyof TBase]-?: {} extends Pick<TBase, K> ? K : never;
}[keyof TBase];

/**
 * 'Override' Implementation #2 - type-fest's 'OverrideProperties'
 * This must stay in this same file which uses it
 */
type OverrideB<
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
