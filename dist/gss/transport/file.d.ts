/// <reference types="node" />
import { Transport } from ".";
export declare class FileTransport extends Transport {
    private options;
    private readonly READ_TIMEOUT;
    constructor(options: FileTransport.Options);
    sendBuffer(buffer: Buffer): Promise<Buffer>;
    sendSessionMessage(msg: Transport.SessionMessage): Promise<Transport.SessionMessage>;
}
export declare namespace FileTransport {
    interface Options {
        path: string;
    }
}
