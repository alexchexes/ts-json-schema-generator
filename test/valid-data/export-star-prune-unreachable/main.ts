import { NotReexported, Reexported, SomeInterface } from "./dep";
import type { ImportedAsTypeNotReexported, ImportedAsTypeReexported } from "./dep";
export { DepType } from "./dep";
export * from "./dep2";

export type MyType = string;

export interface MyObject extends SomeInterface {
    bar?: number;
    baz?: NotReexported;
    qux?: ImportedAsTypeNotReexported;
}

export { Reexported };
export { ImportedAsTypeReexported };
