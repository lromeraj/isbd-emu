import moment, { Moment } from "moment";

export const MSG_REV    = 0x01
export const MSG_H_LEN  = 3;

export const IE_H_LEN               = 3;

export const IE_MO_HEADER_ID        = 0x01;
export const IE_MO_HEADER_LEN       = 28;

export const IE_MO_LOCATION_ID      = 0x03;
export const IE_MO_LOCATION_LEN     = 11;

export const IE_MO_CONFIRMATION_ID  = 0x05;
export const IE_MO_CONFIRMATION_LEN = 1;

export const IE_MO_PAYLOAD_ID       = 0x02;

export const IE_MT_HEADER_ID        = 0x41;
export const IE_MT_HEADER_LEN       = 21;

export const IE_MT_CONFIRMATION_ID  = 0x44;
export const IE_MT_CONFIRMATION_LEN = 25;

export const IE_MT_PAYLOAD_ID       = 0x42;
export const IE_MT_PRIORITY_ID      = 0x46;

export interface Message {
  rev?: number;
  length?: number;
}

export namespace Message { 

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

    export interface Header extends IE {
  
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
    
    export interface Payload extends IE {
      payload: Buffer;
    }
    
    export interface Location extends IE {
      
      /**
       * @deprecated Use `lon` instead
       */
      longitude?: number;

      /**
       * @deprecated Use `lat` instead
       */
      latitude?: number;
      
      lat: {
        deg: number; // negative or positive
        min: number; // thousand minutes
      };

      lon: {
        deg: number; // negative or positive
        min: number; // thousand minutes
      };

      cepRadius: number;
    }
    
    export interface Confirmation extends IE {
      status: number;
    }

  }

  export interface MT extends Message {
    header?: MT.Header;
    payload?: MT.Payload;
    confirmation?: MT.Confirmation;
  }
  
  export namespace MT {

    export interface Header extends IE {

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

    export namespace Header {

      export enum Flag {
        NONE              = 0x0000,
        FLUSH_MT_QUEUE    = 0x0001,
        SEND_RING_ALERT   = 0x0002, 
      }

    }

    export interface Payload extends IE {
      payload: Buffer;
    }

    export interface Confirmation extends IE {

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
  export function getDDLocation( location: Message.MO.Location ) {

    const latitude = 
      location.lat.deg 
        + Math.sign( location.lat.deg ) * ( location.lat.min / 60000 );
    
    const longitude = 
      location.lon.deg 
        + Math.sign( location.lon.deg ) * ( location.lon.min / 60000 );
  
    return {
      latitude,
      longitude, 
    };
  
  }
  
  export function isMO( object: { [key: string]: any } ): boolean {
    if ( object.header ) {
      if ( object.header.cdr !== undefined ) {
        return true;
      }
    }
    return false;
  }
  
  export function isMT( object: { [key: string]: any } ): boolean {
    if ( object.header ) {
      if ( object.header.ucmid !== undefined ) {
        return true;
      }
    } else if ( object.confirmation ) {
  
      if ( object.confirmation.ucmid !== undefined 
          && object.confirmation.autoid !== undefined ) {
        return true;
      }
    }
    return false;
  } 
  
  
  function toJSONObject( object: { [key: string]: any } ) {
    for ( let key in object ) {
  
      const val = object[ key ];
  
      if ( val instanceof Buffer ) {
        object[ key ] = [ ... val ];
      } else if ( typeof val === 'string' && key === 'payload' ) {
        object[ key ] = [ ... Buffer.from( val ) ];
      } else if ( moment.isMoment( val ) ) {
        object[ key ] = val.unix();
      } else if ( typeof val === 'object' ) {
        toJSONObject( val );
      }
    }
  }
  
  export function toJSON( object: { 
    [key: string]: any 
  }, pretty: boolean = false): string {
  
    const objCopy = { ...object };
  
    toJSONObject( objCopy );
  
    if ( pretty ) {
      return JSON.stringify( objCopy, null, '\t' );
    } else {
      return JSON.stringify( objCopy );
    }
  }
  
  function fromJSONObject( 
    object: { [key: string]: any } 
  ) {
  
    for ( let key in object ) {
  
      const val = object[ key ];
      
      if ( val instanceof Array 
        || ( typeof val === 'string' && key === 'payload' ) ) {
        object[ key ] = Buffer.from( val );
      } else if ( typeof val === 'number' && key === 'time' ) {
        object[ key ] = moment.unix( val );
      } else if ( typeof val === 'object' ) {
        fromJSONObject( val );
      }
  
    }
  }
  
  export function fromJSON( jsonStr: string ) {
    const obj = JSON.parse( jsonStr );
    fromJSONObject( obj );
    return obj;
  }

}

