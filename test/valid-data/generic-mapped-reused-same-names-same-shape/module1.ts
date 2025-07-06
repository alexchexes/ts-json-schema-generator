import { MyHelper } from "./helper";

type Base = { foo: string; bar: number }; // ← The object is exactly like the one used in module2.ts, but still, it is not the same object. Gotta decide how we handle naming in such cases (while implementing usage of names instead of internal identifiers in reused generics)

type Patch = { bar: string; baz: boolean }; // ← Non-exported reused object is different but has a same name as in module2.ts. Gotta make sure we handle collisions gracefully while implementing usage of names instead of internal identifiers

type Resolved = MyHelper<Base, Patch>;

export interface Foo1 {
    beta: Resolved;
}
export interface Bar1 {
    gamma: Resolved;
}
