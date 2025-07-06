interface Base {
    foo: string;
    [key: string]: unknown;
}

export type MyObject = { [K in keyof Base]: any };
