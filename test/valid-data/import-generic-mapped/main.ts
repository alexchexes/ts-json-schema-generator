import { MappedGeneric } from "./MappedGeneric";

type Sample = { foo: string; bar: number };

export type MyObject = MappedGeneric<Sample>;

// type MappedGeneric<T> = { [K in keyof T]: T[K] };
