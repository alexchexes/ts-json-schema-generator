import { myObj, MyClass, myArray, mFunction } from "./module";

export const myFunction = (
    str = "something",
    num = 123,
    bool = true,
    [a, b, c] = [1, 2, 3],
    obj = { a: 1, b: 2 },
    clas = new MyClass(),
    func = (a: number, b: number) => a + b, // fails
    object = myObj, // fails
    func1 = mFunction, // fails
    arr = myArray, // fails
) => {
    return "whatever";
};
