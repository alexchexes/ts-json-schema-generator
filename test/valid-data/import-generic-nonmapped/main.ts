import { Identity } from "./Identity";

export type MyObject = Identity<{ foo: string; bar: number }>;

// type Identity<T> = T;
