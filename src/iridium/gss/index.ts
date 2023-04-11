import { MOTransport } from "./transport";

import * as fastq from "fastq";
import type { queueAsPromised } from "fastq";
import moment from "moment";
import logger from "../../logger";
import http from "http";
import sio from "socket.io";
import colors from "colors";
import net from "net";
import { SUServer } from "./servers/su";

interface SubscriberUnit {
  momsn: number;
  mtmsn: number;
  location: GSS.UnitLocation;
  moMsgQueue: queueAsPromised<MOTransport.Message>;
}
 
export class GSS {

  private subscriberUnits: { 
    [key: string]: SubscriberUnit 
  } = {};
  
  
  // TODO: do the same for MT server
  private suServer: SUServer;
  private mtServer: net.Server;

  private moTransports: MOTransport[];
  
  private mtSocketQueue: queueAsPromised<net.Socket>;

  constructor( options: GSS.Options ) {

    this.moTransports = options.moTransports;

    this.suServer = new SUServer( options.suServer );

    this.suServer.on( 'initSession', ( req, callback ) => {
      this.initSession( req ).then( callback );
    })

    this.mtSocketQueue = fastq.promise( 
      this.mtMsgWorker.bind( this ), 1 )

    this.mtServer = net.createServer();

    this.mtServer.listen( options.mtServerPort, () => {
      logger.success( `MT server ready, port=${
        colors.yellow( options.mtServerPort.toString() )
      }` );
    })

    this.mtServer.on( 'connection', socket => {       
      this.mtSocketQueue.push( socket );
    })

    /*
    this.moMsgQueue = fastq.promise( 
      this.moMsgWorker.bind( this ), 1 );
    
    this.mtMsgQueue = fastq.promise(
      this.mtMsgWorker.bind( this ), 1 );
    */

  }

  // private increaseMTMSN( isu: SubscriberUnit  ) {
  //   isu.mtmsn = ( isu.mtmsn + 1 ) & 0xFFFF;
  // }

  private async mtMsgWorker( socket: net.Socket ) { 
    
    const maxMsgLen = 512; // bytes
    const socketTimeout = 5000; // milliseconds

    let bytesRead = 0;
    let bytesToRead = maxMsgLen; // this works as a maximum limit too
    let buffersRead: Buffer[] = []
    let headerBuffer: Buffer | null = null;

    socket.setTimeout( socketTimeout );

    socket.on( 'timeout', () => {
      socket.destroy();
    })

    socket.on( 'data', buffer => {
      
      buffersRead.push( buffer );
      bytesRead += buffer.length;

      if ( headerBuffer === null && bytesRead >= 3 ) { // wait for at least three bytes
        
        headerBuffer = buffersRead.length > 1
          ? Buffer.concat( buffersRead )
          : buffersRead[ 0 ]

        buffersRead = []

        const protoRev = headerBuffer.readUint8( 0 );
        const msgLen = headerBuffer.readUint16BE( 1 );
        
        if ( protoRev === 0x01 && msgLen <= maxMsgLen ) {
          // OVERALL MSG HEADER + MSG LEN
          //       3 bytes        N bytes = 3 + N
          bytesToRead = 3 + msgLen;
        } else {
          socket.destroy();
          return;
        }

      }

      if ( bytesRead === bytesToRead ) {
        // TODO: parse message

        // socket.write()
      } else if ( bytesRead > bytesRead ) {
        socket.destroy();
        return;
      }


    })

  }

  private async moMsgWorker( msg: MOTransport.Message ) {

    const promises = this.moTransports.map(
      transport => transport.sendMessage( msg ) );

    return Promise.allSettled( promises ).then( results => {

      const msgSent = 
        results.some( res => res.status === 'fulfilled' )

      if ( msgSent ) {
        
        logger.debug( `MO #${
          colors.green( msg.momsn.toString() )
        } sent from ISU ${ 
          colors.bold( msg.imei ) 
        }`)

        return msg;

      } else {
        
        setTimeout( () => {
          this.subscriberUnits[ msg.imei ].moMsgQueue.push( msg )
        }, 30000 ); // TODO: this should be incremental
        
        logger.error( `MO #${
          colors.red(msg.momsn.toString())
        } failed from ISU ${ 
          colors.bold( msg.imei ) 
        }`)

        throw new Error( `Could not send message` )
      }

    })

  }

  private getISU( imei: string ) {

    let isu = this.subscriberUnits[ imei ];
    
    if ( isu === undefined ) {
      isu = this.subscriberUnits[ imei ] = {
        momsn: 0,
        mtmsn: 0,
        location: this.generateUnitLocation(),
        moMsgQueue: fastq.promise( 
          this.moMsgWorker.bind( this ), 1 )
      }
    }

    return isu;
  }

  async initSession( sessionReq: GSS.SessionRequest ): Promise<GSS.SessionResponse> {

    const isu = this.getISU( sessionReq.imei )

    isu.momsn = sessionReq.momsn; // update isu momsn

    const sessionResp: GSS.SessionResponse = {
      mosts: 0,
      momsn: isu.momsn,
      mtsts: 0,
      mtmsn: isu.mtmsn,
      mt: Buffer.from([]),
      mtq: 0,
    }
    
    
    
    if ( sessionReq.mo.length > 0 ) {

      const transportMsg: MOTransport.Message = {
        imei: sessionReq.imei,
        momsn: sessionReq.momsn,
        mtmsn: isu.mtmsn,
        payload: sessionReq.mo,
        sessionTime: moment(),
        unitLocation: this.generateUnitLocation(),
        sessionStatus: GSS.Session.Status.TRANSFER_OK,
      }
      
      isu.moMsgQueue.push( transportMsg );      
    }

    sessionResp.mosts = 0;

    return sessionResp;
  }

  private generateUnitLocation(): GSS.UnitLocation {
    return {
      coord: [ -90 + Math.random() * 180, -90 + Math.random() * 180 ],
      cepRadius: 1 + Math.floor( Math.random() * 2000 ),
    }
  }

}

export namespace GSS {

  export interface Options {
    mtServerPort: number;
    suServer: SUServer.Options;
    moTransports: MOTransport[];
  }

  export interface SessionRequest {
    mo: Buffer;
    imei: string;
    momsn: number;
    alert: boolean;
  }

  export interface SessionResponse {
    mosts: number;
    momsn: number;
    mtsts: number;
    mtmsn: number;
    mt: Buffer;
    mtq: number;
  }

  export interface UnitLocation {
    coord: [ number, number ];
    cepRadius: number;
  }

  export namespace Session {

    export enum Status {

      /**
       * The SBD session between the ISU and the Iridium Gateway
       * completed successfully.
       */
      TRANSFER_OK             = 0,

      /**
       * The MT message queued at the Iridium Gateway is too large to be 
       * transferred within a single SBD session
       */
      MT_MSG_TOO_LARGE        = 1,

      /**
       * The SBD Session timed out before session completion
       */
      SBD_TIMEOUT             = 10,

      /**
       * The MO message being transferred by the ISU is too large to be 
       * transferred within a single SBD session
       */
      MO_MSG_TOO_LARGE        = 12,

      /**
       * A RF link loss occurred during the SBD session
       */
      INCOMPLETE_TRANSFER     = 13,

      /**
       * An ISU protocol anomaly occurred during the SBD session
       */
      SBD_PROTOCOL_ERROR      = 14,

      /**
       * The ISU is not allowed to access the system
       */
      SBD_DENIAL              = 15,

    }

  }
}