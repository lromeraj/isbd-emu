import type { ATInterface } from "./interface";
export declare class ATCmd<ContextType> {
    readonly name: string;
    private regExp;
    private context;
    private cmdHandlers;
    constructor(name: string, context: ContextType);
    /**
     * Fully qualified name
     */
    get fqn(): string;
    private testHandler;
    test(at: ATInterface, cmdStr: string): undefined | Promise<string | number | void>;
    onExec(handler: ATCmd.HandlerCallback<ContextType>): this;
    onExec(regExp: RegExp, handler: ATCmd.HandlerCallback<ContextType>): this;
    onRead(callback: ATCmd.HandlerCallback<ContextType>): this;
    onSet(regexp: RegExp, callback: ATCmd.HandlerCallback<ContextType>): this;
    onTest(callback: ATCmd.HandlerCallback<ContextType>): this;
    static wrapContext<T = undefined>(name: string, callback: (cmd: ATCmd<T>) => void): ATCmd.ContextWrapper<T>;
}
export declare namespace ATCmd {
    enum Status {
        OK = 0,
        ERR = 1
    }
    interface Handler<ContextType> {
        callback: HandlerCallback<ContextType>;
        regexp?: RegExp;
    }
    type HandlerCallback<ContextType> = (this: ContextType, at: ATInterface, match: string[]) => Promise<string | number | void>;
    type ContextWrapper<T> = (context: T) => ATCmd<T>;
}
