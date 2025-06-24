export type MyHelper<A, B> = { [K in keyof A as K extends keyof B ? never : K]: A[K] } & B;

type Base = { foo: string; bar: number };
type Patch = { bar: string; baz: boolean };

type Resolved = MyHelper<Base, Patch>; // ← not exported

export interface Foo {
    beta: Resolved;
}
export interface Bar {
    gamma: Resolved;
}
