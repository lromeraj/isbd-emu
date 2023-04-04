import logger from "../logger";
import { SerialPort } from "serialport";
import { ATInterface } from "../at/interface";
import { CMD_CGSN, CMD_SBDRB, CMD_SBDTC, CMD_SBDWB } from "./commands";

export interface ModemOptions {
  imei?: string;
  serialPort: SerialPort;
}

export interface MobileBuffer {
  buffer: Buffer;
  checksum: number;
}

export class Modem {

  sp: SerialPort;
  at: ATInterface<Modem>; // TODO: this looks like inheritance ???
  imei: string;

  moBuffer: MobileBuffer = {
    buffer: Buffer.alloc( 0 ),
    checksum: 0,
  }

  mtBuffer: MobileBuffer = {
    buffer: Buffer.alloc( 0 ),
    checksum: 0,
  }
  
  constructor( options: ModemOptions ) {

    this.sp = options.serialPort;
    this.imei = options.imei || '527695889002193';

    this.at = new ATInterface<Modem>( this.sp, this ); // TODO: again inheritance ....


    this.at.registerCommands([
      CMD_CGSN,
      CMD_SBDTC,
      CMD_SBDRB,
      CMD_SBDWB,
    ])

  } 


}


export function computeChecksum( message: Buffer ) {
  let payloadChecksum = 0;
  for ( let i = 0; i < message.length; i++ ) {
    payloadChecksum += message[ i ];
  }
  return ( payloadChecksum & 0xFFFF );
}

/**
 * Checks if the given mobile buffer checksum is valid
 * 
 * @param buffer Full message including trailing checksum
 * @param payloadLength The length of the payload (excluding checksum)
 * @returns Checksum validity
 */
export function validateMB( mo: MobileBuffer ): boolean {
  return mo.checksum === computeChecksum( mo.buffer ); 
}

/**
 * 
 * @param at 
 * @param payloadLength 
 * @returns 
 */
export function readMB<T>( at: ATInterface<T>, payloadLength: number ): Promise<MobileBuffer> {
  return at.readBytes( payloadLength + 2, 60000 ).then( buffer => ({
    buffer: buffer.subarray( 0, payloadLength ),
    checksum: buffer.readUInt16BE( payloadLength )
  }))
}