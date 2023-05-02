
import * as fastq from "fastq";
import type { queueAsPromised } from "fastq";
import moment from "moment";
import http from "http";
import sio from "socket.io";
import colors from "colors";
import net from "net";
import EventEmitter from "events";
import * as logger from "../../../logger";
import { GSS } from "../..";

const log = logger.create( 'isu-server' );

// https://stackoverflow.com/a/39145058
// export declare interface SUServer {
//   on(
//     event: 'initSession', 
//     listener: (
//       req: GSS.SessionRequest, 
//       callback: ( res: GSS.SessionResponse ) => void 
//     ) => void 
//   ): this;
// }

export class ISUServer extends EventEmitter {

  private httpServer: http.Server;
  private socketServer: sio.Server;
  
  private sockets: {
    [key: string]: sio.Socket | undefined
  } = {}

  private handlers: MOServer.Handlers;

  constructor( options: MOServer.Options ) {
    
    super();

    this.handlers = {
      initSession: () => Promise.reject( new Error('Not implemented') )
    }

    Object.assign( this.handlers, options.handlers );
    
    this.httpServer = http.createServer()
    this.socketServer = new sio.Server( this.httpServer );

    this.httpServer.listen( options.port, () => {
      log.success( `ISU server ready, port=${
        colors.yellow( options.port.toString() )
      }` );
    })
      
    this.socketServer.on( 'connect', socket => {

      const imei = socket.handshake.query.imei; 
      
      if ( typeof imei === 'string' ) {
        
        this.sockets[ imei ] = socket;

        socket.on( 'initSession', (
          sessionReq: GSS.SessionRequest, 
          callback: ( sessionResp: GSS.SessionResponse ) => void 
        ) => {
          this.handlers.initSession( sessionReq ).then( callback )
            .catch( err => {
              log.error( `Init session failed => ${ err.stack }` );
          })
        })
        
        socket.on( 'disconnect', () => {
          delete this.sockets[ imei ];
          log.debug( `ISU ${ colors.bold( imei ) } disconnected` );
        })

        log.debug( `ISU ${ colors.bold( imei ) } connected` );

      } else {
        socket.disconnect();
      }
      
    })

  }

  sendRingAlert( imei: string ) {

    const socket = this.sockets[ imei ];
    
    log.debug( `Sending ring alert to ${ imei }` );
    
    if ( socket ) {
      socket.emit( 'ring' );
    }

  }

}

export namespace MOServer {

  export interface Handlers {
    initSession: InitSessionHandler;
  }

  export interface Options {
    port: number;
    handlers: Handlers;
  }

  export type InitSessionHandler = ( req: GSS.SessionRequest ) => Promise<GSS.SessionResponse>;

}