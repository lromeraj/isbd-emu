import * as logger from "../logger"
import Colors from "colors";
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

const log = logger.create( __filename );

// TODO: rename to AT Server ...
export class ATInterface {

  sp: SerialPort;
  private commands: ATCmd<any>[] = [];
  private status: ATIStatus = ATIStatus.WAITING;

  echo: boolean = false; // TODO: expose echo
  quiet: boolean = false; // TODO: expose quiet
  verbose: boolean = true; // TODO: expose verbose

  private atCmdStr = '';
  private atCmdMask = 'AT';

  private enqueuedLines: { 
    [key: string]: string 
  };
  
  private requests: {
    delimiter: ATInterface.Delimiter,
    callback: ( buffer: Buffer ) => void,
  }[] = []

  private requestBuffer: number[] = [];

  constructor( serialPortOpts: ATInterface.SerialPortOptions ) {
    
    this.enqueuedLines = {}

    this.sp = new SerialPort({ 
      path: serialPortOpts.path || '/tmp/tty', 
      baudRate: serialPortOpts.baudRate || 115200,
      autoOpen: typeof serialPortOpts.path === 'string',
    }, err => {

      if ( err ) {
        log.error( `AT interface failed on ${ 
					Colors.red( this.sp.path ) 
				}: ${ err.message }` );
      } else {
        log.info( `AT interface ready on ${ 
					Colors.yellow( this.sp.path ) 
				}` );
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
          this.requests.shift();
        } 

      }

    })

  }

  enqueueLine( str: string, id: string ) {
  
    if ( this.status == ATIStatus.WAITING ) {
      this.writeLine( str );
    } else {
      this.enqueuedLines[ id ] = str;
    }

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
        
        log.debug( `Processing command: [${
          Colors.bold.cyan( cmd.fqn.toUpperCase() )
        }] ${
          Colors.blue( this.escapeLine( atCmdStr ) )
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
          log.error( `Internal command error => ${ err.stack }` )

        }).finally(() => {
          this.writeEnqueuedLines();
          this.status = ATIStatus.WAITING;
        })
        
        // TODO: we could run over other commands to check ambiguity
        return;
      }

    }

    log.error( `Unknown command: ${
      Colors.red( this.escapeLine( atCmdStr ) )
    }` )

    this.status = ATIStatus.WAITING;
    this.writeStatus( ATCmd.Status.ERR );

  }

  private writeEnqueuedLines() {
    for ( let key in this.enqueuedLines ) {
      this.writeLine( this.enqueuedLines[ key ] );
    }
    this.enqueuedLines = {};
  }

  private getLineStart() {
    return this.verbose ? '\r\n' : '';
  }

  private getLineEnd() {
    return this.verbose ? '\r\n' : '\r';
  }

  setFlowControl( flowControl: boolean ) {
    this.sp.settings.rtscts = flowControl;
  }

  setEcho( echo: boolean ) {
    this.echo = echo;
  }

  setQuiet( quiet: boolean ) {
    this.quiet = quiet;
  }

  setVerbose( verbose: boolean ) {
    this.verbose = verbose;
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

    log.debug( `Writing line: ${ 
      Colors.blue( this.escapeLine( line ) ) 
    }` )

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

  // TODO: accept string as parameter too ??
  private writeStatus( sts: ATCmd.Status ) {
    
    if ( this.quiet ) return;
    
    if ( sts === ATCmd.Status.OK ) {
      this.writeLine( this.verbose ? 'OK' : '0' );
    } else {
      this.writeLine( this.verbose ? 'ERROR' : '4' );
    }
  }

}

export namespace ATInterface {
  export interface SerialPortOptions {
    path: string | null;
    baudRate?: number;
  };
  export type Delimiter = ( currentByte: number, currentBuf: number[] ) => boolean
}