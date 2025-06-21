import { Reexported, NotReexported } from "./dep";
import type { AsTypeReexported, AsTypeNotReexported } from "./dep";

export { Reexported };
export type { AsTypeReexported };

export { DirectlyReexported } from "./dep";
export type { AsTypeDirectlyReexported } from "./dep";

export * from "./intermediate";

export interface MyObject {
    foo?: Reexported;
    bar?: NotReexported;
    baz?: AsTypeReexported;
    qux?: AsTypeNotReexported;
}
