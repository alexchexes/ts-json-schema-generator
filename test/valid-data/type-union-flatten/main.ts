type BaseLevel = 'A' | 'B';
export type ExtendedLevel = 'X' | BaseLevel | 'Y';

export type ExportedBase = 'C' | 'D';
export type ExtendedWithRef = 'Z' | ExportedBase | 'W';
