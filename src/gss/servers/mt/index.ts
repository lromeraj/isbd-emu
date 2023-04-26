import net, { Socket } from "net";
import colors from "colors";
import { EventEmitter } from "events";

import logger from "../../../logger";
import fastq, { queueAsPromised } from "fastq";
import { TCPTransport } from "../../transport/tcp";
import { decodeMtMessage } from "../../msg/decoder";
import { Message } from "../../msg";
import { encodeMtMessage } from "../../msg/encoder";

export class MTServer extends EventEmitter {

  private tcpServer: net.Server;
  private handlers: MTServer.Handlers;

  private mtMsgQueue: queueAsPromised<Buffer[], Message.MT>;

  constructor( options: MTServer.Options ) {

    super();

    this.handlers = {
      mt: () => Promise.reject( new Error('Not implemented') )
    }

    Object.assign( this.handlers, options.handlers );

    this.mtMsgQueue = fastq.promise(
      this.mtMsgWorker.bind( this ), 1 );

    this.tcpServer = net.createServer();

    this.tcpServer.listen( options.port, () => {
      logger.success( `MT server ready, port=${
        colors.yellow( options.port.toString() )
      }` );
    })

    this.tcpServer.on( 'connection',
      this.socketHandler.bind( this ) );

  }

  private async mtMsgWorker( buffers: Buffer[] ) {

    const buffer = Buffer.concat( buffers );

    logger.debug( `Decoding incoming MT message size=${
      colors.yellow( buffer.length.toString() ) 
    }` );

    const mtMsg = decodeMtMessage( buffer );
    
    if ( mtMsg ) {
      return this.handlers.mt( mtMsg );
    } else {
      throw new Error( `Could not decode MT message` );
    }

  }

  private async socketHandler( socket: net.Socket ) { 

    const MAX_MSG_LEN = 1024; // maximum message length
    const SOCKET_TIMEOUT = 5000; // milliseconds
    const PROTO_HEADER_LEN = 3; // protocol header length
    
    let bytesRead = 0;
    let bytesToRead = MAX_MSG_LEN; // this works as a maximum limit too
    let buffersRead: Buffer[] = []
    let headerBuffer: Buffer | null = null;

    socket.setTimeout( SOCKET_TIMEOUT );
    
    socket.on( 'timeout', () => {
      socket.destroy();
    })

    socket.on( 'data', buffer => {
      
      buffersRead.push( buffer );
      bytesRead += buffer.length;
      
      if ( headerBuffer === null
        && bytesRead >= PROTO_HEADER_LEN ) {
        
        headerBuffer = buffersRead.length > 1
          ? Buffer.concat( buffersRead )
          : buffersRead[ 0 ]
        
        buffersRead = [ headerBuffer ]

        const protoRev = headerBuffer.readUint8( 0 );
        const msgLen = headerBuffer.readUint16BE( 1 );
        
        if ( protoRev === 0x01 && msgLen <= MAX_MSG_LEN ) {
          
          // PROTO HEADER LENGTH  +   MSG LEN
          //       3 bytes            N bytes = 3 + N
          bytesToRead = PROTO_HEADER_LEN + msgLen;

        } else {
          socket.destroy();
          return;
        }

      }

      if ( bytesRead === bytesToRead ) {

        this.mtMsgQueue.push( buffersRead ).then( mtConfirm => {
          
          console.log( mtConfirm );
          
          socket.write( encodeMtMessage( mtConfirm ), () => {
            socket.end();
          });

        }).catch( err => {
          socket.destroy();
          logger.error( `Error processing MT message => ${ err.message }` );
        })

      } else if ( bytesRead > bytesToRead ) {
        socket.destroy();
      }

    })

  }

}

export namespace MTServer {

  export interface Handlers {
    mt: Handler;
  };

  export type Handler = ( msg: Message.MT ) => Promise<Message.MT>;

  export interface Options {
    port: number;
    handlers?: Handlers;
  }
}