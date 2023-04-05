import logger from "../logger"
import colors, { underline } from "colors";
import { SerialPort } from "serialport";
import { ATCmd } from "./cmd";

import { 
  CMD_AT, 
  CMD_DTR, 
  CMD_ECHO, 
  CMD_FLOW_CONTROL, 
  CMD_QUIET, 
  CMD_VERBOSE 
} from "./commands";

enum ATIStatus {
  WAITING,
  PROCESSING,
};

export class ATInterface {

  private sp: SerialPort;
  private commands: ATCmd<any>[] = [];
  private status: ATIStatus = ATIStatus.WAITING;

  private echo: boolean = false; // TODO: expose echo
  private quiet: boolean = false; // TODO: expose quiet
  private verbose: boolean = true; // TODO: expose verbose

  private atCmdStr = '';
  private atCmdMask = 'AT';
  
  private requests: {
    delimiter: ATInterface.Delimiter,
    callback: ( buffer: Buffer ) => void,
  }[] = []

  private requestBuffer: number[] = [];

  constructor( serialPortOpts: ATInterface.SerialPortOptions ) {
    
    this.sp = new SerialPort({ 
      path: serialPortOpts.path, 
      baudRate: serialPortOpts.baudRate,
      autoOpen: true,
    }, err => {
      if ( err ) {
        logger.error( err.message )
      } else {
        logger.success( `Modem is ready` )
      }
    });

    this.sp.on( 'data', ( buffer: Buffer ) => {
      
      if ( this.status === ATIStatus.WAITING ) {
        // TODO: Considere this possibility
        // if ( this.requestBuffer.length > 0 ) {
        //   this.requestBuffer = Buffer.from([]);
        // }
        this.waitingCommand( buffer );
      } else if ( this.status === ATIStatus.PROCESSING ) {
        this.processingCmd( buffer );
      }

    })

    this.registerCommands([
      CMD_AT,
      CMD_ECHO,
      CMD_QUIET,
      CMD_VERBOSE,
      CMD_DTR,
      CMD_FLOW_CONTROL,
    ])

  }

  private processingCmd( buffer: Buffer ) {
    
    buffer.forEach( byte => {
      
      this.requestBuffer.push( byte );
      const currentReq = this.requests[ 0 ];
      
      if ( currentReq ) {

        if ( currentReq.delimiter( byte, this.requestBuffer ) ) {
          currentReq.callback( Buffer.from( this.requestBuffer ) )
          this.requestBuffer = [];
          this.requests.shift()
        } 

      }

    })
    

  }

  private waitingCommand( buffer: Buffer ) {

    buffer.forEach( byte => {
          
      let addByte = true;
      
      if ( this.atCmdStr.length < this.atCmdMask.length ) {
        const byteCode = String.fromCharCode( byte ).toUpperCase();
        const maskCode = this.atCmdMask.charAt( this.atCmdStr.length );
        if ( byteCode !== maskCode ) {
          addByte = false;
        }
      }
      
      if ( addByte ) {

        const char = String.fromCharCode( byte );
        this.atCmdStr += char;
        
        if ( this.echo ) {
          this.sp.write( char );
        }

        if ( byte === 13 ) {
          this.processCommand( this.atCmdStr );
          this.atCmdStr = '';
        }

      }

    })

  }

  private escapeLine( line: string ) {
    return line
      .replace( /\r/g, '\\r' )
      .replace( /\n/g, '\\n' )
  }

  private processCommand( atCmdStr: string ) {

    this.status = ATIStatus.PROCESSING;

    for ( let cmd of this.commands ) {

      const promise = cmd.test( this, atCmdStr );

      if ( promise ) {
        
        logger.debug( `Processing command: [${
          colors.bold.cyan( cmd.fqn.toUpperCase() )
        }] ${
          colors.blue( this.escapeLine( atCmdStr ) )
        }` )

        promise.then( str => {

          if ( typeof str === 'number' ) {
            this.writeStatus( str );
          } else if ( typeof str === 'string' ) {
            this.writeLine( str );
          } else {
            this.writeStatus( ATCmd.Status.OK );
          }

        }).catch( err => {

          // TODO: write AT error response ????
          logger.error( `Internal command error => ${ err.stack }` )

        }).finally(() => {
          this.status = ATIStatus.WAITING;
        })
        
        // TODO: we could run over other commands to check ambiguity
        return;
      }

    }

    logger.error( `Unknown command: ${
      colors.red( this.escapeLine( atCmdStr ) )
    }` )

    this.status = ATIStatus.WAITING;
    this.writeStatus( ATCmd.Status.ERR );

  }

  private getLineStart() {
    return this.verbose ? '\r\n' : '';
  }

  private getLineEnd() {
    return this.verbose ? '\r\n' : '\r';
  }

  setFlowControl( flowControl: boolean ) {
    this.sp.settings.rtscts = flowControl;
    if ( flowControl ) {
      logger.info( `Flow control enabled` );
    } else {
      logger.info( `Flow control disabled` );
    }
  }

  setEcho( echo: boolean ) {
    this.echo = echo;
    if ( echo ) {
      logger.info( `Echo enabled` );
    } else {
      logger.info( `Echo disabled` );
    }
  }

  setVerbose( verbose: boolean ) {
    this.verbose = verbose;
    if ( verbose ) {
      logger.info( `Verbose mode enabled` );
    } else {
      logger.info( `Verbose mode disabled` );
    }
  }

  readRawUntil( 
    delimiter: ATInterface.Delimiter, timeout: number 
  ): Promise<Buffer> {

    return new Promise( ( resolve, reject ) => {

      const timer = setTimeout( () => {
        reject( new Error( 'Read timeout' ) )
      }, timeout );

      this.requests.push({
        delimiter,
        callback: buffer => {
          clearTimeout( timer );
          resolve( buffer );
        }
      })

    })
  }

  writeRaw( buffer: Buffer ) {
    this.sp.write( buffer );
    this.sp.drain();
  }

  writeLine( line: string ) {
    this.writeRaw( Buffer.from( 
      this.getLineStart() + line + this.getLineEnd() ) )
  }

  writeLineStart( line: string ) {
    this.writeRaw( Buffer.from( this.getLineStart() + line ) )
  }

  writeLineEnd( line: string ) {
    this.writeRaw( Buffer.from( line + this.getLineEnd() ) )
  }

  registerCommand<T>( atCmd: ATCmd.ContextWrapper<T> | ATCmd<T>, context?: T ): void {
    if ( typeof atCmd === 'function' && context ) {
      this.commands.push( atCmd( context ) );
    } else if ( atCmd instanceof ATCmd ) {
      this.commands.push( atCmd );
    }
  }

  registerCommands<T>( atCmds: ATCmd<T>[] ): void;
  registerCommands<T>( atCmds: ATCmd.ContextWrapper<T>[], context: T ): void;
  registerCommands<T>( atCmds: ATCmd.ContextWrapper<T>[] | ATCmd<T>[], context?: T ): void {
    atCmds.forEach( atCmd => {
      this.registerCommand( atCmd, context );
    })
  }

  private writeStatus( sts: ATCmd.Status ) {
    if ( sts === ATCmd.Status.OK ) {
      this.writeLine( this.verbose ? 'OK' : '0' );
    } else {
      this.writeLine( this.verbose ? 'ERROR' : '4' );
    }
  }

}

export namespace ATInterface {
  export interface SerialPortOptions {
    path: string;
    baudRate: number;
  };
  export type Delimiter = ( currentByte: number, currentBuf: number[] ) => boolean
}