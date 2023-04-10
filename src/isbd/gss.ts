import { MOTransport } from "./transport";

import * as fastq from "fastq";
import type { queueAsPromised } from "fastq";
import moment from "moment";

export class GSS {

  momsn: number = 0;
  mtmsn: number = 0;

  private moTransports: MOTransport[];
  private moMsgQueue: queueAsPromised<MOTransport.Message>;
  private mtMsgQueue: queueAsPromised<MOTransport.Message>;

  constructor( options: GSS.Options ) {

    this.moTransports = options.moTransports;

    this.moMsgQueue = fastq.promise( 
      this.moMsgWorker.bind( this ), 1 );
    
    this.mtMsgQueue = fastq.promise(
      this.mtMsgWorker.bind( this ), 1 );

  }

  private increaseMTMSN() {
    this.mtmsn = ( this.mtmsn + 1 ) & 0xFFFF;
  }

  private increaseMOMSN() {
    this.momsn = ( this.momsn + 1 ) & 0xFFFF;
  }

  private async mtMsgWorker( ) { 

  }

  private async moMsgWorker( msg: MOTransport.Message ) {

    const promises = this.moTransports.map(
      transport => transport.sendMessage( msg ) );

    return Promise.allSettled( promises ).then( results => {

      const msgSent = 
        results.some( res => res.status === 'fulfilled' )

      if ( msgSent ) {
        return msg;
      } else {
        setTimeout( () => {
          this.moMsgQueue.push( msg )
        }, 30000 ); // TODO: this should be incremental
        throw new Error( `Could not send message` )
      }

    })

  }


  getMOMSN() {
    return this.momsn;
  }

  getMTMSN() {
    return this.mtmsn;
  }

  async initSession( srcMsg: {
    imei: string,
    payload: Buffer,
  }, alert: boolean = false ): Promise<GSS.Session> {
    
    let mosts = 32;

    if ( srcMsg.payload.length > 0 ) {

      const destMsg: MOTransport.Message = {
        imei: srcMsg.imei,
        momsn: this.momsn,
        mtmsn: this.mtmsn,
        payload: srcMsg.payload,
        sessionTime: moment(),
        unitLocation: this.generateUnitLocation(),
      }
      
      mosts = 0;
      this.moMsgQueue.push( destMsg );

    } else {
      mosts = 3;
    }

    const sessionData: GSS.Session = {
      mosts,
      momsn: this.getMOMSN(),
      mtsts: 0,
      mtmsn: this.getMTMSN(),
      mtlen: 0,
      mtq: 0,
    }

    // TODO: This should be increased only if session 
    // TODO: is completed successfully
    this.increaseMOMSN();

    return sessionData;
  }

  private generateUnitLocation(): MOTransport.Message.UnitLocation {
    return {
      coord: [ -90 + Math.random() * 180, -90 + Math.random() * 180 ],
      cepRadius: Math.random() * 50,
    }
  }

}

export namespace GSS {
  export interface Options {
    moTransports: MOTransport[];
  }

  export interface Session {
    mosts: number;
    momsn: number;
    mtsts: number;
    mtmsn: number;
    mtlen: number;
    mtq: number;
  }
}