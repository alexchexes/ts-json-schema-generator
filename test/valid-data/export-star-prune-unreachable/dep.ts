export interface SomeInterface {
    foo?: string;
}

export type DepType = string;

export interface NotReexported {
    nested?: boolean;
}

export interface Reexported {
    nested?: boolean;
}

export interface ImportedAsTypeReexported {
    nested?: boolean;
}

export interface ImportedAsTypeNotReexported {
    nested?: boolean;
}
