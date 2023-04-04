import logger from "../logger"
import colors, { underline } from "colors";

import { SerialPort } from "serialport";

import { ATCmd } from "./cmd";
import { CMD_AT, CMD_DTR, CMD_ECHO, CMD_FLOW_CONTROL, CMD_QUIET, CMD_VERBOSE } from "./commands";

enum ATIStatus {
  WAITING,
  PROCESSING,
};

export class ATInterface<CmdCtxType = null> {

  private sp: SerialPort;
  private context: CmdCtxType; 
  private commands: ATCmd<CmdCtxType>[] = [];
  private status: ATIStatus = ATIStatus.WAITING;

  private echo: boolean = false;
  private quiet: boolean = false;
  private verbose: boolean = true;

  private atCmdStr = '';
  private atCmdMask = 'AT';

  private requestBuffer: Buffer = Buffer.from([]);

  private requests: {
    length: number,
    callback: ( buffer: Buffer ) => void,
  }[] = []

  constructor( sp: SerialPort, context: CmdCtxType ) {
    
    this.sp = sp;
    this.context = context;

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

    const currentReq = this.requests[ 0 ];
    
    this.requestBuffer = Buffer.concat([ 
      this.requestBuffer, buffer 
    ])
    
    if ( currentReq ) {
      if ( this.requestBuffer.length >= currentReq.length ) {
        
        currentReq.callback( 
          this.requestBuffer.subarray( 0, currentReq.length ) );
        
        this.requestBuffer = 
          this.requestBuffer.subarray( currentReq.length );
        
        this.requests.shift();
      }
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

  private processCommand( atCmdStr: string ) {

    this.status = ATIStatus.PROCESSING;
    let atCmdStrFiltered = atCmdStr.replace( /\r$/ig, '' );

    for ( let cmd of this.commands ) {

      const promise = cmd.test( this, atCmdStrFiltered, this.context );

      if ( promise ) {
        
        logger.debug( `Processing command: ${ 
          colors.blue( atCmdStrFiltered ) 
        }` )

        promise.then( () => {
       
          // ! We could allow to commands to
          // ! return a status code but this should not be necessary
          // ! If the command was tested means that everything was OK
          // ! at the AT interface layer
          this.writeStatus( ATCmd.Status.OK );

        }).catch( err => {
          // TODO: write AT error response ????
          logger.error( `Internal command error => ${ err.stack }` )
        }).finally(() => {
          this.status = ATIStatus.WAITING;
        })

        return;
      }

    }

    logger.error( `Unknown command: ${
      colors.red( atCmdStrFiltered )
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
  
  readBytes( n: number, timeout: number ): Promise<Buffer> {

    return new Promise( ( resolve, reject ) => {

      const timer = setTimeout( () => {
        reject( new Error( 'Read timeout' ) )
      }, timeout );

      this.requests.push({
        length: n,
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

  registerCommand( atCmd: ATCmd<CmdCtxType> ) {
    this.commands.push( atCmd );
  }

  registerCommands( atCmds: ATCmd<CmdCtxType>[] ) {
    this.commands.push( ... atCmds );
  }

  private writeStatus( sts: ATCmd.Status ) {
    if ( sts === ATCmd.Status.OK ) {
      this.writeLine( this.verbose ? 'OK' : '0' );
    } else {
      this.writeLine( this.verbose ? 'ERROR' : '4' );
    }
  }

}