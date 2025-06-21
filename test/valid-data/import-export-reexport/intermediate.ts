import { Dep2_Reexported, Dep2_NotReexported } from "./dep2";
import type { Dep2_AsTypeReexported, Dep2_AsTypeNotReexported } from "./dep2";

export { Dep2_Reexported };
export type { Dep2_AsTypeReexported };

export { Dep2_DirectlyReexported } from "./dep2";
export type { Dep2_AsTypeDirectlyReexported } from "./dep2";

export interface IntermediateFileObject {
    foo?: Dep2_Reexported;
    bar?: Dep2_NotReexported;
    baz?: Dep2_AsTypeReexported;
    qux?: Dep2_AsTypeNotReexported;
}
