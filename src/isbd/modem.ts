import logger from "../logger";
import nodemailer from "nodemailer";
import { ATInterface } from "../at/interface";
import { 
  CMD_CGSN, 
  CMD_SBDD, 
  CMD_SBDIX, 
  CMD_SBDIXA, 
  CMD_SBDRB, 
  CMD_SBDRT, 
  CMD_SBDTC, 
  CMD_SBDWB, 
  CMD_SBDWT 
} from "./commands";
import { MOTransport } from "./transport";
import { GSS } from "./gss";

export interface ModemOptions {

  imei?: string;
  
  dte: {
    path: string
  };

  gss: GSS.Options;

  volatile?: boolean;

}

export interface MobileBuffer {
  buffer: Buffer;
  checksum: number;
}

export class Modem {

  imei: string;

  gss: GSS;
  at: ATInterface;

  moBuffer: MobileBuffer = {
    buffer: Buffer.alloc( 0 ),
    checksum: 0,
  };

  mtBuffer: MobileBuffer = {
    buffer: Buffer.alloc( 0 ),
    checksum: 0,
  };
  
  constructor( options: ModemOptions ) {
    
    this.gss = new GSS( options.gss );

    this.at = new ATInterface({
      baudRate: 19200,
      path: options.dte.path,
    });

    this.imei = options.imei || '527695889002193';

    this.at.registerCommands([
      CMD_CGSN,
      CMD_SBDTC,
      CMD_SBDRB,
      CMD_SBDWB,
      CMD_SBDIX,
      CMD_SBDIXA,
      CMD_SBDD,
      CMD_SBDWT,
      CMD_SBDRT,
    ], this )

  }



  static clearMobileBuffer( mobBuf: MobileBuffer ) {
    mobBuf.checksum = 0;
    mobBuf.buffer = Buffer.alloc(0);
  }

  static updateMobileBuffer( mobBuf: MobileBuffer, buffer: Buffer, checksum?: number ) {
    
    mobBuf.buffer = buffer;
    mobBuf.checksum = checksum === undefined 
      ? computeChecksum( buffer ) 
      : checksum;

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
 * Reads a mobile buffer from the given AT interface
 * 
 * @param at 
 * @param payloadLength 
 * @returns 
 */
export function readMB( at: ATInterface, payloadLength: number ): Promise<MobileBuffer> {

  const delimiter: ATInterface.Delimiter = ( byte, buf ) => 
    buf.length >= payloadLength + 2

  return at.readRawUntil( delimiter, 60000 ).then( buffer => ({
    buffer: buffer.subarray( 0, payloadLength ),
    checksum: buffer.readUInt16BE( payloadLength )
  }))
}
