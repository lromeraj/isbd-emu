/// <reference types="node" />
import { Transport } from "./transport";
import { TCPTransport } from "./transport/tcp";
import { Message } from "./msg";
export declare class GSS {
    private autoId;
    private subscriberUnits;
    /**
     * This server is to allow emulated ISUs to communicate
     * with the GSS
     */
    private isuServer;
    /**
     * This server is used to handle incoming MT message requests
     */
    private mtServer;
    /**
     * This transports are used for every MO message sent by ISUs
     */
    private transports;
    constructor(options: GSS.Options);
    private getAutoId;
    private mtMsgHandler;
    private sessionMsgWorker;
    private getISU;
    initSession(sessionReq: GSS.SessionRequest): Promise<GSS.SessionResponse>;
    static generateUnitLocation(): GSS.UnitLocation;
}
export declare namespace GSS {
    interface Options {
        mtServer: {
            port: number;
            transport?: TCPTransport;
        };
        moServer: {
            port: number;
        };
        transports: Transport[];
    }
    interface SessionRequest {
        mo: Buffer;
        imei: string;
        momsn: number;
        alert: boolean;
    }
    interface SessionResponse {
        mosts: number;
        momsn: number;
        mtsts: number;
        mtmsn: number;
        mt: Buffer;
        mtq: number;
    }
    interface UnitLocation extends Message.MO.Location {
    }
    namespace Session {
        enum Status {
            /**
             * The SBD session between the ISU and the Iridium Gateway
             * completed successfully.
             */
            TRANSFER_OK = 0,
            /**
             * The MT message queued at the Iridium Gateway is too large to be
             * transferred within a single SBD session
             */
            MT_MSG_TOO_LARGE = 1,
            /**
             * The SBD Session timed out before session completion
             */
            SBD_TIMEOUT = 10,
            /**
             * The MO message being transferred by the ISU is too large to be
             * transferred within a single SBD session
             */
            MO_MSG_TOO_LARGE = 12,
            /**
             * A RF link loss occurred during the SBD session
             */
            INCOMPLETE_TRANSFER = 13,
            /**
             * An ISU protocol anomaly occurred during the SBD session
             */
            SBD_PROTOCOL_ERROR = 14,
            /**
             * The ISU is not allowed to access the system
             */
            SBD_DENIAL = 15
        }
    }
}
