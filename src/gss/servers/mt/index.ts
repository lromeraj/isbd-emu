import net from "net";
import colors from "colors";
import { EventEmitter } from "events";

import logger from "../../../logger";
import fastq, { queueAsPromised } from "fastq";
import { TCPTransport } from "../../transport/tcp";
import { decodeMtMessage } from "../../msg/decoder";

export class MTServer extends EventEmitter {

  private tcpServer: net.Server;
  private transport?: TCPTransport;
  private mtMsgQueue: queueAsPromised<Buffer[]>;

  constructor( options: MTServer.Options ) {

    super();
    this.transport = options.transport;

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

  private async mtMsgWorker( mtBuffers: Buffer[] ) {

    const buffer = Buffer.concat( mtBuffers );
    logger.debug( `Decoding incoming MT message size=${ 
      colors.yellow( buffer.length.toString() ) 
    }` );

    const mtMsg = decodeMtMessage( buffer );
      
    if ( mtMsg ) {
      if ( this.transport ) {
        // TODO: this.transport.sendMessage( mtMsg, encodeM.bind( this ) );
      } else {
        logger.error( `Could not send MT confirmation, TCP transport is not defined` );
      }
    } else {
      logger.error( `Could not decode MT message` );
    }

  }

  private async socketHandler( socket: net.Socket ) { 
    
    const MAX_MSG_LEN = 512; // absolute limit
    const SOCKET_TIMEOUT = 5000; // milliseconds
    const PROTO_HEADER_LEN = 3;

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
        socket.end();
        this.mtMsgQueue.push( buffersRead )
      } else if ( bytesRead > bytesToRead ) {
        socket.destroy();
      }

    })

  }

}

export namespace MTServer {

  export interface Options {
    port: number;
    transport?: TCPTransport;
  }
}