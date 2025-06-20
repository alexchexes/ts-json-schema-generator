import type { SomeInterface } from "./dep";
import type { Dep3 } from "./dep3";

export { DepType } from "./dep";
export * from "./dep2";

export type MyType = string;

export interface MyObject extends SomeInterface {
    bar?: number;
    baz?: Dep3;
}
