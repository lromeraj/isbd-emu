import { MOTransport } from "./transport";

import * as fastq from "fastq";
import type { queueAsPromised } from "fastq";
import moment from "moment";
import logger from "../../logger";
import colors from "colors";
import { SUServer } from "./servers/su";
import { MTServer } from "./servers/mt";

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
  
  /**
   * This server is to allow emulated ISUs to coomunicate
   * with the GSS
   */
  private suServer: SUServer;

  /**
   * This server is used to handle incoming MT message requests
   */
  private mtServer: MTServer;

  /**
   * This transports are used for every MO message sent by ISUs
   */
  private moTransports: MOTransport[];
  
  constructor( options: GSS.Options ) {

    this.moTransports = options.moTransports;

    this.suServer = new SUServer({
      port: options.suServer.port,
      handlers: {
        initSession: this.initSession.bind( this )
      }
    });

    this.mtServer = new MTServer({
      port: options.mtServer.port
    });

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
    mtServer: {
      port: number;
    };
    suServer: { 
      port: number;
    };
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