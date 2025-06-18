// type OptKeys<T> = {
//     [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
// }[keyof T];

// interface Foo {
//     foo: null;
// }

// export type MyObject = OptKeys<Foo>;

// --------------------------
//
// --------------------------
// Override properties but ensure no new properties added
// type Override<TBase, TOverride extends { [K in keyof TOverride]: K extends keyof TBase ? unknown : never }> = {
//     [K in keyof TBase as K extends keyof TOverride ? never : K]: TBase[K]; // keep everything except overrides
// } & {
//     [K in keyof TOverride]: K extends keyof TBase
//         ? K extends OptionalKeys<TBase> // preserve optionality
//             ? TOverride[K] | undefined
//             : TOverride[K]
//         : never;
// };
// type OptionalKeys<TBase> = {
//     [K in keyof TBase]-?: {} extends Pick<TBase, K> ? K : never;
// }[keyof TBase];

// interface Base {
//     foo: string;
//     bar: null;
// }
// export type MyObject = Override<Base, { bar: number }>;

// --------------------------
// Separately
// --------------------------

// type Keep<TBase, TOverride extends { [K in keyof TOverride]: K extends keyof TBase ? unknown : never }> = {
//     [K in keyof TBase as K extends keyof TOverride ? never : K]: TBase[K]; // keep everything except overrides
// };

// type Overrides<TBase, TOverride extends { [K in keyof TOverride]: K extends keyof TBase ? unknown : never }> = {
//     [K in keyof TOverride]: K extends keyof TBase
//         ? K extends OptionalKeys<TBase> // preserve optionality
//             ? TOverride[K] | undefined
//             : TOverride[K]
//         : never;
// };
// type OptionalKeys<TBase> = {
//     [K in keyof TBase]-?: {} extends Pick<TBase, K> ? K : never;
// }[keyof TBase];

// interface Base {
//     foo: string;
//     bar: null;
// }

// export type KeepPart = Keep<Base, { bar: number }>;

// export type OverridePart = Overrides<Base, { bar: number }>;

// --------------------------
//
// --------------------------
// widen-check.ts
// interface Base {
//     foo: string;
//     bar: null;
// }
// type Overrides = { bar: number };

// // (1) what the generator thinks
// export type KeysOverride = keyof Overrides; // ← generator may say string|bar

// // (2) what the generator thinks after the map
// export type KeysAfterKeep = Exclude<keyof Base, keyof Overrides>;

// --------------------------
//  Separately 2
// --------------------------
// type Keep<B, O extends keyof B> = { [K in O]: B[K] };
// type Overrides<O> = O;

// interface Base {
//     foo: string;
//     bar: null;
// }

// // 1️⃣ keep-everything object (= Base minus override keys)
// export type KeepPart = Keep<Base, Exclude<keyof Base, "bar">>;

// // 2️⃣ override object (= just "bar")
// export type OverridePart = Overrides<{ bar: number }>;

// --------------------------
//
// --------------------------

// type Override<B, O extends { [K in keyof O]: K extends keyof B ? unknown : never }> = {
//     [K in keyof B as K extends keyof O ? never : K]: B[K];
// } & {
//     [K in keyof O]: O[K];
// };

// interface Base {
//     foo: string;
//     bar: null;
// }
// export type MyObject = Override<Base, { bar: number }>;

// --------------------------
//
// --------------------------

// no indexed-access here, so no UnknownType
type Keep<B, O extends keyof B> = { [K in O]: B[K] };
type Override<B, O> = Keep<B, Exclude<keyof B, keyof O>> & O;

interface Base {
    foo: string;
    bar: null;
}

export type MyObject = Override<Base, { bar: number }>;
