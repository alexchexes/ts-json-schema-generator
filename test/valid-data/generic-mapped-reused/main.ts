export type MyHelper<A, B> = {
    [K in keyof A as K extends keyof B ? never : K]: A[K];
} & B;

type Base = { foo: string; bar: number };
type Patch = { bar: string; baz: boolean };

export interface Foo {
    beta: MyHelper<Base, Patch>;
}
export interface Bar {
    gamma: MyHelper<Base, Patch>;
}
