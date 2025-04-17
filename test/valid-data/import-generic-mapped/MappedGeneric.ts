export type MappedGeneric<T> = { [K in keyof T]: T[K] };
