/// <reference types="node" />
import { ATInterface } from "../at/interface";
import { GSS } from "../gss";
import * as sio from "socket.io-client";
export interface ModemOptions {
    imei?: string;
    dte: {
        path: string;
    };
    gss: {
        uri?: string;
        host?: string;
        port?: number;
    };
    volatile?: boolean;
}
export interface MobileBuffer {
    buffer: Buffer;
    checksum: number;
}
interface CIEV {
    svca: number;
    sigq: number;
}
export declare class Modem {
    imei: string;
    at: ATInterface;
    ciev: CIEV;
    cier: {
        mode: number;
        sigind: number;
        svcind: number;
    };
    momsn: number;
    mtmsn: number;
    moBuffer: MobileBuffer;
    mtBuffer: MobileBuffer;
    socket: sio.Socket;
    updateCIEV(ciev: Partial<CIEV>): void;
    constructor(options: ModemOptions);
    private increaseMOMSN;
    initSession(opts: {
        alert?: boolean;
    }): Promise<GSS.SessionResponse>;
    static clearMobileBuffer(mobBuf: MobileBuffer): void;
    static updateMobileBuffer(mobBuf: MobileBuffer, buffer: Buffer, checksum?: number): void;
}
export declare function computeChecksum(message: Buffer): number;
/**
 * Checks if the given mobile buffer checksum is valid
 *
 * @param buffer Full message including trailing checksum
 * @param payloadLength The length of the payload (excluding checksum)
 * @returns Checksum validity
 */
export declare function validateMB(mo: MobileBuffer): boolean;
/**
 * Reads a mobile buffer from the given AT interface
 *
 * @param at
 * @param payloadLength
 * @returns
 */
export declare function readMB(at: ATInterface, payloadLength: number): Promise<MobileBuffer>;
export {};
