import net from "net";
import colors from "colors";
import { EventEmitter } from "events";

import logger from "../../../../logger";
import fastq, { queueAsPromised } from "fastq";
import { buffer } from "stream/consumers";

export class MTServer extends EventEmitter {

  private tcpServer: net.Server;
  private mtMsgQueue: queueAsPromised<Buffer[]>;

  constructor( options: MTServer.Options ) { 
    super();

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

  private async mtMsgWorker( chunks: Buffer[] ) {

    const decodedMsg = this.decode( 
      Buffer.concat( chunks ), 3 );
      
    if ( decodedMsg ) {
      // send confirmation message
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

  private encodeConfirmation( 
    msg: MTServer.Message 
  ): Buffer {

    const IE_ID = 0x44;
    const IE_LENGTH = 25;

    return Buffer.from([]);
  }

  private decodePayload(
    msg: MTServer.Message, buffer: Buffer, offset: number
  ): number {

    const id = buffer.readUint8( offset );
    const length = buffer.readUint16BE( offset + 1 );

    msg.mtPayload = {
      id,
      length,
      payload: buffer.subarray( offset + 3, offset + 3 + length )
    }
    
    // InformationElement  +  MT Payload
    //     3 (bytes)       +  N (bytes) = 3 + N bytes
    return 3 + length;
  }

  private decodeHeader( 
    msg: MTServer.Message, buffer: Buffer, offset: number 
  ): number {

    msg.mtHeader = {
      id: buffer.readUint8( offset ),
      length: buffer.readUint16BE( offset + 1 ),
      ucmid: buffer.subarray( offset + 3, offset + 7 ),
      imei: buffer.subarray( offset + 7, offset + 22 ).toString( 'ascii' ),
      flags: buffer.readUint16BE( offset + 22 ),
    }
    
    // InformationElement  +  MT Header
    //     3 (bytes)       +  21 (bytes) = 24 bytes
    return 24;
  }

  private decode( 
    buf: Buffer, 
    offset: number = 0 
  ): MTServer.Message | null {

    const msg: MTServer.Message = {};

    for ( let i=0; i < buf.length; i++ ) {

      if ( buf[ i ] === 0x41 ) {
        i += this.decodeHeader( msg, buf, i );
      } else if ( buf[ i ] === 0x42 ) {
        i += this.decodePayload( msg, buf, i );
      } else {
        return null;
      }

    }

    return msg;
  }

}


export namespace MTServer {

  export interface Options {
    port: number;
  }

  export interface Message {
    mtHeader?: Message.Header;
    mtPayload?: Message.Payload;
  }

  export namespace Message {

    /**
     * Message Information Element
     */
    export interface IE { 
      id: number;
      length: number;
    }
    
    export interface Header extends IE {

      /**
       * Unique Client Message ID
       */
      ucmid: Buffer;
      imei: string;
      flags: Header.Flags;
    }

    export namespace Header {
      export enum Flags {
        FLUSH_MT_QUEUE    = 0x0001,
        SEND_RING_ALERT   = 0x0002, 
      }
    }
  
    export interface Payload extends IE {
      payload: Buffer;
    }

    export interface Confirmation extends IE {
  
    }



  }

}