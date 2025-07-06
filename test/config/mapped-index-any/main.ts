interface Base {
    foo: string;
    [key: string]: any;
}

type Keep<B> = { [K in keyof B]: B[K] };

export type MyObject = Keep<Base>;
