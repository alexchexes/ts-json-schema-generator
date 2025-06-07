import { Mapped } from "./Mapped";

export type MyObject = Mapped;

// type Mapped = { [K in "foo" | "bar"]: K }; // used to generate the expected schema
