import colors from "colors";
import net, { Socket } from "net";
import logger from "../../logger";
import { MOTransport } from ".";

export class TCPTransport extends MOTransport {

  // private socket: Socket;
  private options: TCPTransport.Options;

  constructor( options: TCPTransport.Options ) {
    super();
    this.options = options;
    // this.socket = new net.Socket();
  }

  sendMessage( msg: MOTransport.Message ): Promise<MOTransport.Message> {
    
    return new Promise(( resolve, reject ) => {

      const rejectSending = ( cli: Socket ) => {
        cli.destroy();
        reject();
      }

      const client = new net.Socket().connect({
        host: this.options.host,
        port: this.options.port,
      }, () => {
        // client.write( 'sff' );
        rejectSending( client );
      })

      client.setTimeout( 5000 );

      client.on( 'timeout', () => {
        logger.error( `TCPTransport timed out for momsn=${ 
          colors.yellow( msg.momsn.toString() ) 
        }`)
        rejectSending( client );
      })

      client.on( 'error', () => {
        logger.error( `TCPTransport failed for momsn=${ 
          colors.yellow( msg.momsn.toString() ) 
        }`)
        rejectSending( client );
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