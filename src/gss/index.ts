import { Transport } from "./transport";

import * as fastq from "fastq";
import type { queueAsPromised } from "fastq";
import moment from "moment";
import logger from "../logger";
import colors from "colors";
import { MOServer } from "./servers/mo";
import { MTServer } from "./servers/mt";
import { TCPTransport } from "./transport/tcp";

interface SubscriberUnit {
  momsn: number;
  mtmsn: number;
  location: GSS.UnitLocation;
  sessionMsgQueue: queueAsPromised<Transport.SessionMessage>;
}
 
export class GSS {

  private subscriberUnits: { 
    [key: string]: SubscriberUnit
  } = {};
  
  /**
   * This server is to allow emulated ISUs to communicate
   * with the GSS
   */
  private suServer: MOServer;

  /**
   * This server is used to handle incoming MT message requests
   */
  private mtServer: MTServer;

  /**
   * This transports are used for every MO message sent by ISUs
   */
  private transports: Transport[];
  
  constructor( options: GSS.Options ) {

    this.transports = options.transports;

    this.suServer = new MOServer({
      port: options.suServer.port,
      handlers: {
        initSession: this.initSession.bind( this )
      }
    });

    this.mtServer = new MTServer({
      port: options.mtServer.port,
      transport: options.mtServer.transport,
    });

  }

  // private increaseMTMSN( isu: SubscriberUnit  ) {
  //   isu.mtmsn = ( isu.mtmsn + 1 ) & 0xFFFF;
  // }

  private async sessionMsgWorker( msg: Transport.SessionMessage ) {

    const promises = this.transports.map(
      transport => transport.sendSessionMessage( msg ) );

    return Promise.allSettled( promises ).then( results => {
      
      // If there is at least one transport that was able to transmit
      // the session message, there is no need to retry for every available
      // transports, this is the expected Iridium behavior
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
          this.subscriberUnits[ msg.imei ].sessionMsgQueue.push( msg )
        }, 30000 ); // TODO: this should be incremental
        
        logger.error( `MO #${
          colors.red(msg.momsn.toString())
        } failed from ISU ${ 
          colors.bold( msg.imei ) 
        }`)

        return Promise.reject();
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
        sessionMsgQueue: fastq.promise(
          this.sessionMsgWorker.bind( this ), 1 )
      }
    }

    return isu;
  }

  async initSession( 
    sessionReq: GSS.SessionRequest 
  ): Promise<GSS.SessionResponse> {

    const isu = this.getISU( sessionReq.imei );

    isu.momsn = sessionReq.momsn; // update isu momsn

    const sessionResp: GSS.SessionResponse = {
      mosts: 0,
      momsn: isu.momsn,
      mtsts: 0,
      mtmsn: isu.mtmsn,
      mt: Buffer.from([]),
      mtq: 0,
    }
    
    const transportMsg: Transport.SessionMessage = {
      imei: sessionReq.imei,
      momsn: sessionReq.momsn,
      mtmsn: isu.mtmsn,
      payload: sessionReq.mo,
      time: moment(),
      location: isu.location,
      status: GSS.Session.Status.TRANSFER_OK,
    }
    
    isu.sessionMsgQueue.push( transportMsg );      
    
    // TODO: handle more error codes
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
    mtServer: {
      port: number;
      transport?: TCPTransport;
    };
    suServer: { 
      port: number;
    };
    transports: Transport[];
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