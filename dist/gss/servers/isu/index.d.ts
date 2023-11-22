/// <reference types="node" />
import EventEmitter from "events";
import { GSS } from "../..";
export declare class ISUServer extends EventEmitter {
    private httpServer;
    private socketServer;
    private sockets;
    private handlers;
    constructor(options: MOServer.Options);
    sendRingAlert(imei: string): void;
}
export declare namespace MOServer {
    interface Handlers {
        initSession: InitSessionHandler;
    }
    interface Options {
        port: number;
        handlers: Handlers;
    }
    type InitSessionHandler = (req: GSS.SessionRequest) => Promise<GSS.SessionResponse>;
}
