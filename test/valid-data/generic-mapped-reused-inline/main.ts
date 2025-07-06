export type MyHelper<A, B> = {
    [K in keyof A as K extends keyof B ? never : K]: A[K];
} & B;

type Base = { foo: string; bar: number };

type Resolved = MyHelper<Base, { bar: string; baz: boolean }>;

export interface Foo {
    beta: Resolved;
}
export interface Bar {
    gamma: Resolved;
}
