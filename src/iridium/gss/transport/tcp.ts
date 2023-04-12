import colors from "colors";
import net, { Socket } from "net";

import { MOTransport } from ".";
import logger from "../../../logger";

export class TCPTransport extends MOTransport {

  // private socket: Socket;
  private options: TCPTransport.Options;

  constructor( options: TCPTransport.Options ) {
    super();
    this.options = options;
  }

  private encodeMessageHeader( msg: MOTransport.Message ): Buffer {
    
    const IE_ID = 0x01;
    const IE_LEN = 28;

    const buffer = Buffer.alloc( 3 + IE_LEN );

    let offset = 0;
    offset = buffer.writeUint8( IE_ID, offset );
    offset = buffer.writeUint16BE( IE_LEN, offset );
    offset = buffer.writeUint32BE( 0, offset ); // TODO: set CDR accordingly
    offset += buffer.write( msg.imei, offset, 15, 'ascii' );
    offset = buffer.writeUint8( msg.sessionStatus, offset );
    offset = buffer.writeUint16BE( msg.momsn, offset );
    offset = buffer.writeUint16BE( msg.mtmsn, offset );
    offset = buffer.writeUint32BE( msg.sessionTime.unix(), offset );

    return buffer;
  }

  private encodeMessagePayload( msg: MOTransport.Message ): Buffer {

    const IE_ID = 0x02;
    const IE_LEN = msg.payload.length;
    const buffer = Buffer.alloc( 3 + IE_LEN );
    
    let offset = 0;
    offset = buffer.writeUInt8( IE_ID, offset );
    offset = buffer.writeUint16BE( IE_LEN, offset );
    offset += msg.payload.copy( buffer, offset );

    return buffer;
  }

  private encodeMessageLocation( msg: MOTransport.Message ): Buffer {

    const IE_ID = 0x03;
    const IE_LEN = 11;

    const buffer = Buffer.alloc( 3 + IE_LEN );

    const nsi = Number( msg.unitLocation.coord[ 0 ] < 0 ) << 1
    const ewi = Number( msg.unitLocation.coord[ 1 ] < 0 )
    
    const latDeg = Math.abs( Math.trunc( msg.unitLocation.coord[ 0 ] ) )
    const lonDeg = Math.abs( Math.trunc( msg.unitLocation.coord[ 1 ] ) )

    let latThoMin = Math.abs( msg.unitLocation.coord[ 0 ] ) % 1 
    let lonThoMin = Math.abs( msg.unitLocation.coord[ 1 ] ) % 1 
    
    latThoMin = Math.round( latThoMin * 60000 )
    lonThoMin = Math.round( lonThoMin * 60000 )

    let offset = 0;
    offset = buffer.writeUint8( IE_ID, offset );
    offset = buffer.writeUint16BE( IE_LEN, offset );
    offset = buffer.writeUint8( nsi | ewi, offset );
    offset = buffer.writeUint8( latDeg, offset );
    offset = buffer.writeUint16BE( latThoMin, offset );
    offset = buffer.writeUint8( lonDeg, offset );
    offset = buffer.writeUint16BE( lonThoMin, offset );
    offset = buffer.writeUint32BE( msg.unitLocation.cepRadius, offset );

    return buffer;
  }

  private encodeMessage( msg: MOTransport.Message ): Buffer {
    
    const protoHeaderBuf = Buffer.alloc( 3 );
    const headerBuf = this.encodeMessageHeader( msg );
    const locationBuf = this.encodeMessageLocation( msg );
    const payloadBuf = this.encodeMessagePayload( msg );

    let offset = 0;
    offset = protoHeaderBuf.writeUint8( 0x01, offset );
    offset = protoHeaderBuf.writeUint16BE(
      headerBuf.length + locationBuf.length + payloadBuf.length, offset );

    return Buffer.concat([ 
      protoHeaderBuf, headerBuf, locationBuf, payloadBuf ]);

  }

  sendMessage( msg: MOTransport.Message ): Promise<MOTransport.Message> {
    
    return new Promise(( resolve, reject ) => {

      const client = new net.Socket().connect({
        host: this.options.host,
        port: this.options.port,
      }, () => {
        client.write( this.encodeMessage( msg ), () => {
          resolveSending();
        });
      })

      const rejectSending = ( err: Error ) => {
        client.destroy();
        reject( err );
      }

      const resolveSending = () => {
        client.end();
        resolve( msg );
      }

      client.setTimeout( 5000 );

      client.on( 'timeout', () => {
        rejectSending( new Error( 'Connection timeout' ) );
      })

      client.on( 'error', err => {
        rejectSending( err );
      });

    }) 

  }

}

export namespace TCPTransport {
  export interface Options {
    port: number;
    host: string;
  }
}