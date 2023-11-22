/// <reference types="node" />
import { Transport } from ".";
export declare class TCPTransport extends Transport {
    private options;
    private readonly SOCKET_TIMEOUT;
    constructor(options: TCPTransport.Options);
    sendBuffer(buffer: Buffer, _opts?: {
        waitResponse: boolean;
    }): Promise<Buffer>;
    sendMessage<T>(msg: T, encoder: (msg: T) => Buffer, _opts?: {
        waitResponse: boolean;
    }): Promise<Buffer>;
    sendSessionMessage(sessionMsg: Transport.SessionMessage): Promise<Transport.SessionMessage>;
    private encodeSessionMessage;
}
export declare namespace TCPTransport {
    interface Options {
        port: number;
        host: string;
    }
}
