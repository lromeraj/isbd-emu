import { Moment } from "moment";

export const MO_IE_HEADER_ID    = 0x01;
export const MO_IE_PAYLOAD_ID   = 0x02;
export const MO_IE_LOCATION_ID  = 0x03;

export const MT_IE_HEADER_ID    = 0x41;
export const MT_IE_PAYLOAD_ID   = 0x42;

export interface Message {
  protoRev?: number;
  length?: number;
}

export namespace Message { 

  interface InformationElement {
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

    export interface Header extends InformationElement {
  
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
    
    export interface Payload extends InformationElement {
      payload: Buffer;
    }
    
    export interface Location extends InformationElement {
      longitude: number;
      latitude: number;
      cepRadius: number;
    }
    
    export interface Confirmation extends InformationElement {
      status: number;
    }

  }

  export interface MT extends Message {
    header?: MT.Header;
    payload?: MT.Payload;
  }
  
  export namespace MT {

    export interface Header extends InformationElement {

      /**
       * Unique Client Message ID
       */
      ucmid: Buffer;

      /**
       * International Mobile Equipment Identity
       */
      imei: string;

      flags: number;
    }

    export namespace Header {

      export enum Flag {
        FLUSH_MT_QUEUE    = 0x0001,
        SEND_RING_ALERT   = 0x0002, 
      }

    }

    export interface Payload extends InformationElement {
      payload: Buffer;
    }

    export interface Confirmation extends InformationElement {
      ucmid: Buffer;
      imei: string;
      autoid: number;
      mtsts: number;
    }

  }

}