/// <reference types="node" />
import { SerialPort } from "serialport";
import { ATCmd } from "./cmd";
export declare class ATInterface {
    sp: SerialPort;
    private commands;
    private status;
    echo: boolean;
    quiet: boolean;
    verbose: boolean;
    private atCmdStr;
    private atCmdMask;
    private enqueuedLines;
    private requests;
    private requestBuffer;
    constructor(serialPortOpts: ATInterface.SerialPortOptions);
    private processingCmd;
    enqueueLine(str: string, id: string): void;
    private waitingCommand;
    private escapeLine;
    private processCommand;
    private writeEnqueuedLines;
    private getLineStart;
    private getLineEnd;
    setFlowControl(flowControl: boolean): void;
    setEcho(echo: boolean): void;
    setQuiet(quiet: boolean): void;
    setVerbose(verbose: boolean): void;
    readRawUntil(delimiter: ATInterface.Delimiter, timeout: number): Promise<Buffer>;
    writeRaw(buffer: Buffer): void;
    writeLine(line: string): void;
    writeLineStart(line: string): void;
    writeLineEnd(line: string): void;
    registerCommand<T>(atCmd: ATCmd.ContextWrapper<T> | ATCmd<T>, context?: T): void;
    registerCommands<T>(atCmds: ATCmd<T>[]): void;
    registerCommands<T>(atCmds: ATCmd.ContextWrapper<T>[], context: T): void;
    private writeStatus;
}
export declare namespace ATInterface {
    interface SerialPortOptions {
        path: string | null;
        baudRate?: number;
    }
    type Delimiter = (currentByte: number, currentBuf: number[]) => boolean;
}
