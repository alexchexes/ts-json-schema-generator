export type TopLevelSpec = {
    view?: BaseViewBackground<SignalRef>;
    config?: Config;
};

export interface BaseViewBackground<S extends SignalRef> extends Partial<Pick<MarkConfig<S>, "strokeJoin">> {}

export interface Config extends MarkConfigMixins<ExprRef | SignalRef>, VgMarkConfig {}

export interface MarkConfig<ES extends ExprRef | SignalRef>
    extends MapExcludeValueRefAndReplaceSignalWith<VgMarkConfig, ES> {}

export interface MarkConfigMixins<ES extends ExprRef | SignalRef> {
    area?: MarkConfig<ES>;
}

export type MapExcludeAndKeepSignalAs<T, E, ES extends ExprRef | SignalRef> = {
    [P in keyof T]: SignalRef extends T[P] ? Exclude<T[P], E> | ES : Exclude<T[P], E>;
};

export type MapExcludeValueRefAndReplaceSignalWith<T, ES extends ExprRef | SignalRef> = MapExcludeAndKeepSignalAs<
    T,
    BaseValueRef<any>,
    ES
>;

export interface ExprRef {
    expr?: string;
}

export type BaseValueRef<T> = SignalRef | { value: T | null };

export interface VgMarkConfig {
    /** Some description */
    strokeJoin?: SignalRef;
}

// /** @hidden */ // // if we uncomment this jsdoc (sic!) @hidden will make schema even more strange (in the `expose: all` mode)
export interface SignalRef {
    signal?: string;
}
