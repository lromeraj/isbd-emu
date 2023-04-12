import logger from "../../logger";
import nodemailer from "nodemailer";
import { ATInterface } from "../../at/interface";
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
import { GSS } from "../gss";

import * as sio from "socket.io-client";

export interface ModemOptions {

  imei?: string;
  
  dte: {
    path: string
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

export class Modem {

  imei: string;
  at: ATInterface;

  momsn: number;
  mtmsn: number;

  moBuffer: MobileBuffer = {
    buffer: Buffer.alloc( 0 ),
    checksum: 0,
  };

  mtBuffer: MobileBuffer = {
    buffer: Buffer.alloc( 0 ),
    checksum: 0,
  };

  socket: sio.Socket;
  
  constructor( options: ModemOptions ) {

    this.at = new ATInterface({
      baudRate: 19200,
      path: options.dte.path,
    });

    const uri = options.gss.uri 
      ? options.gss.uri
      : `ws://${ options.gss.host }:${ options.gss.port }`;


    this.momsn = 0;
    this.mtmsn = 0;

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


    this.socket = sio.connect( uri, {
      query: {
        imei: this.imei,
      }
    })

    this.socket.on( 'connect', () => {
      logger.debug( `GSS reached` );
    })

    this.socket.on( 'disconnect', () => {
      logger.debug( `GSS lost` );
    })



  }

  private increaseMOMSN() {
    this.momsn = ( this.momsn + 1 ) & 0xFFFF;
  }

  initSession( opts: { 
    alert?: boolean 
  }): Promise<GSS.SessionResponse> {

    return new Promise( ( res, rej ) => {

      const sessionReq: GSS.SessionRequest = {
        imei: this.imei,
        mo: this.moBuffer.buffer,
        momsn: this.momsn,
        alert: opts.alert || false,
      }

      this.socket.on( 'ringAlert', () => {
        // this.at.writeLine( 'SBDRING' ); // TODO
      })


      this.socket.timeout( 15000 ).emit( 
        'initSession', sessionReq, ( err: Error | null, sessionResp: GSS.SessionResponse ) => {

          if ( err ) {
            
            res({
              mosts: 32,
              mtsts: 0,
              momsn: this.momsn,
              mtmsn: this.mtmsn,
              mt: this.mtBuffer.buffer,
              mtq: 0
            });

          } else {
            
            if ( this.moBuffer.buffer.length > 0 ) {
              this.increaseMOMSN();
            }

            this.mtmsn = sessionResp.mtmsn;

            if ( sessionResp.mtsts === 1 ) {
              Modem.updateMobileBuffer( this.mtBuffer, sessionResp.mt );
            }
            res( sessionResp );
          }
      })

    })


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