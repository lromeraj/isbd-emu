
import * as fastq from "fastq";
import type { queueAsPromised } from "fastq";
import moment from "moment";
import http from "http";
import sio from "socket.io";
import colors from "colors";
import net from "net";
import EventEmitter from "events";
import logger from "../../../../logger";
import { GSS } from "../..";


// https://stackoverflow.com/a/39145058
export declare interface SUServer {
  on(
    event: 'initSession', 
    listener: (
      req: GSS.SessionRequest, 
      callback: ( res: GSS.SessionResponse ) => void 
    ) => void 
  ): this;
}

export class SUServer extends EventEmitter {

  private httpServer: http.Server;
  private socketServer: sio.Server;

  constructor( options: SUServer.Options ) {
    super();

    this.httpServer = http.createServer()
    this.socketServer = new sio.Server( this.httpServer );

    this.httpServer.listen( options.port, () => {
      logger.success( `SU server ready, port=${
        colors.yellow( options.port.toString() )
      }` );
    })
        
    this.socketServer.on( 'connect', socket => {
      
      const imei = socket.handshake.query.imei; 

      if ( typeof imei === 'string' ) {

        socket.on( 'initSession', (
          sessionReq: GSS.SessionRequest, 
          callback: ( sessionResp: GSS.SessionResponse ) => void 
        ) => {

          this.emit( 'initSession', sessionReq, callback );
          // this.initSession( sessionReq ).then( callback )
        })
        
        socket.on( 'disconnect', () => {
          logger.debug( `ISU ${ colors.bold( imei ) } disconnected` );
        })

        logger.debug( `ISU ${ colors.bold( imei ) } connected` );

      } else {
        socket.disconnect();
      }
      
    })

  }

}


export namespace SUServer {

  export interface Options {
    port: number;
  }

}