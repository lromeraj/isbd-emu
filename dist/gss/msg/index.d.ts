/// <reference types="node" />
import { Moment } from "moment";
export declare const MSG_REV = 1;
export declare const MSG_H_LEN = 3;
export declare const IE_H_LEN = 3;
export declare const IE_MO_HEADER_ID = 1;
export declare const IE_MO_HEADER_LEN = 28;
export declare const IE_MO_LOCATION_ID = 3;
export declare const IE_MO_LOCATION_LEN = 11;
export declare const IE_MO_CONFIRMATION_ID = 5;
export declare const IE_MO_CONFIRMATION_LEN = 1;
export declare const IE_MO_PAYLOAD_ID = 2;
export declare const IE_MT_HEADER_ID = 65;
export declare const IE_MT_HEADER_LEN = 21;
export declare const IE_MT_CONFIRMATION_ID = 68;
export declare const IE_MT_CONFIRMATION_LEN = 25;
export declare const IE_MT_PAYLOAD_ID = 66;
export declare const IE_MT_PRIORITY_ID = 70;
export interface Message {
    rev?: number;
    length?: number;
}
export declare namespace Message {
    interface IE {
        id?: number;
        length?: number;
    }
    export interface MO extends Message {
        header?: MO.Header;
        payload?: MO.Payload;
        location?: MO.Location;
        confirmation?: MO.Confirmation;
    }
    export namespace MO {
        interface Header extends IE {
            /**
             * Each call data record (CDR) maintained in the Iridium Gateway Database is given a unique value
             * independent of all other information in order to absolutely guarantee that each CDR is able to be
             * differentiated from all others. This reference number, also called the auto ID, is included should the need for
             * such differentiation and reference arise.
             */
            cdr: number;
            /**
             * International Mobile Equipment Identity
             */
            imei: string;
            /**
             * Message status
             */
            status: number;
            /**
             * Mobile Originated Message Sequence Number
             */
            momsn: number;
            /**
             * Mobile Terminated Message Sequence Number
             */
            mtmsn: number;
            /**
             * Indicated the time when the message was processed (first arrived)
             * by the Iridium GSS
             */
            time: Moment;
        }
        interface Payload extends IE {
            payload: Buffer;
        }
        interface Location extends IE {
            /**
             * @deprecated Use `lon` instead
             */
            longitude?: number;
            /**
             * @deprecated Use `lat` instead
             */
            latitude?: number;
            lat: {
                deg: number;
                min: number;
            };
            lon: {
                deg: number;
                min: number;
            };
            cepRadius: number;
        }
        interface Confirmation extends IE {
            status: number;
        }
    }
    export interface MT extends Message {
        header?: MT.Header;
        payload?: MT.Payload;
        confirmation?: MT.Confirmation;
    }
    export namespace MT {
        interface Header extends IE {
            /**
             * Unique Client Message ID
             */
            ucmid: Buffer;
            /**
             * International Mobile Equipment Identity
             */
            imei: string;
            flags?: number;
        }
        namespace Header {
            enum Flag {
                NONE = 0,
                FLUSH_MT_QUEUE = 1,
                SEND_RING_ALERT = 2
            }
        }
        interface Payload extends IE {
            payload: Buffer;
        }
        interface Confirmation extends IE {
            /**
             * Unique Client Message ID
             */
            ucmid: Buffer;
            /**
             * International Mobile Equipment Identity
             */
            imei: string;
            autoid: number;
            status: number;
        }
    }
    /**
     * Converts the given mobile orginated message location
     * into a decimal degreee coordinate representation
     *
     * @param location
     * @returns Decimal degree coordiante representation
     */
    export function getDDLocation(location: Message.MO.Location): {
        latitude: number;
        longitude: number;
    };
    export function isMO(object: {
        [key: string]: any;
    }): boolean;
    export function isMT(object: {
        [key: string]: any;
    }): boolean;
    export function toJSON(object: {
        [key: string]: any;
    }, pretty?: boolean): string;
    export function fromJSON(jsonStr: string): any;
    export {};
}
