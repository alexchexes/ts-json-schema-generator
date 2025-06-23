export type A = "foo" | "bar";
export type B = "baz" | "quz";

export type C = A | B;

export interface MyObject {
    foo: C;
}
