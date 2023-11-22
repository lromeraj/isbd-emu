/// <reference types="node" />
import { EventEmitter } from "events";
import { Message } from "../../msg";
export declare class MTServer extends EventEmitter {
    private tcpServer;
    private handlers;
    private mtMsgQueue;
    constructor(options: MTServer.Options);
    private mtMsgWorker;
    private socketHandler;
}
export declare namespace MTServer {
    interface Handlers {
        mtMsg: Handler;
    }
    type Handler = (msg: Message.MT) => Promise<Message.MT>;
    interface Options {
        port: number;
        handlers?: Handlers;
    }
}
