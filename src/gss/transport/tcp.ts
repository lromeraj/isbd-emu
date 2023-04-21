import colors from "colors";
import net, { Socket } from "net";

import { Transport } from ".";
import { encodeMoMsg } from "../msg/encoder";
import { Message } from "../msg";

export class TCPTransport extends Transport {

  private options: TCPTransport.Options;
  private readonly SOCKET_TIMEOUT = 5000;

  constructor( options: TCPTransport.Options ) {
    super();
    this.options = options;
  }

  sendMessage<T>( 
    msg: T, 
    encoder: ( msg: T ) => Buffer 
  ): Promise<T> {

    return new Promise(( resolve, reject ) => {

      const client = new net.Socket().connect({
        host: this.options.host,
        port: this.options.port,
      }, () => {
        client.write( encoder( msg ), err => {
          
          if ( err ){
            rejectSending( err );
          } else {
            resolveSending();
          }

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

      client.setTimeout( this.SOCKET_TIMEOUT );

      client.on( 'timeout', () => {
        rejectSending( new Error( 'Socket timeout' ) );
      })

      client.on( 'error', err => {
        rejectSending( err );
      });

    }) 

  }

  sendSessionMessage( 
    sessionMsg: Transport.SessionMessage
  ): Promise<Transport.SessionMessage> {
    return this.sendMessage( sessionMsg, 
      this.encodeSessionMessage.bind( this ) );
  }

  private encodeSessionMessage( msg: Transport.SessionMessage ): Buffer {

    const moMsg: Message.MO = {
      header: {
        cdr: 0,   // TODO: set CDR accordingly, 
                  // TODO: this field should be included in the SessionMessage type
        momsn: msg.momsn,
        mtmsn: msg.mtmsn,
        imei: msg.imei,
        status: msg.status,
        time: msg.time,
      },
      location: {
        latitude: msg.location.coord[ 0 ],
        longitude: msg.location.coord[ 1 ],
        cepRadius: msg.location.cepRadius,
      },
    }

    if ( msg.payload.length > 0 ) {
      moMsg.payload = {
        payload: msg.payload,
        length: msg.payload.length,
      };
    }

    return encodeMoMsg( moMsg );
    
  }

}

export namespace TCPTransport {

  export interface Options {
    port: number;
    host: string;
  }

}