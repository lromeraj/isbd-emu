/// <reference types="node" />
import { Transport } from ".";
export declare class SMTPTransport extends Transport {
    private transporter;
    private readonly options;
    constructor(options: SMTPTransport.Options);
    sendBuffer(buffer: Buffer): Promise<Buffer>;
    private getStatusFromMsg;
    private getTextFromMsg;
    private getSubjectFromMsg;
    private getFilenameFromMsg;
    sendSessionMessage(msg: Transport.SessionMessage): Promise<Transport.SessionMessage>;
}
export declare namespace SMTPTransport {
    interface Options {
        host: string;
        port: number;
        user: string;
        password?: string;
        to?: string;
    }
}
