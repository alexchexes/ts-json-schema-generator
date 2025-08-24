export type Union1 = "A" | "B" | "C";
export type Union2 = Union1 | "D" | "E";
export type Union3 = Union2 | "F" | "G";

export interface MyObject {
    union1: Union1;
    union2: Union2;
    union3: Union3;
}
