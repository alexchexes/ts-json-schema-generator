// part of OverrideB2 which is type-fest's 'OverrideProperties'
export type Simplify<T> = { [KeyType in keyof T]: T[KeyType] } & {};
