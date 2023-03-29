import colors from "colors";
import logger from "./logger";
import { SerialPort } from "serialport";
import EventEmitter from "events";

enum ATIStatus {
  WAITING,
  PROCESSING,
};

export class ATInterface extends EventEmitter {

  private sp: SerialPort;
  private commands: ATCmd[] = [];
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

  constructor( sp: SerialPort ) {
    
    super();

    this.sp = sp;

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

    let atCmdStrFiltered = atCmdStr.replace( /^AT|\r$/ig, '' );

    logger.debug( `Processing command ${ 
      colors.green( atCmdStr.slice( 0, 2 ) + atCmdStrFiltered ) 
    } ...` )

    for ( let cmd of this.commands ) {
      const promise = cmd.test( this, atCmdStrFiltered )
      if ( promise ) {
        promise.then( sts => {
          this.writeStatus( sts );
        }).catch( err => {
          logger.error( `Internal command error => ${ err.stack }` )
          // TODO: write at error response ????
        }).finally(() => {
          this.status = ATIStatus.WAITING;
        })
        return;
      }
    }

    this.status = ATIStatus.WAITING;
    this.writeStatus( ATCmd.Status.UNK );
 
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
  
  readBytes( n: number, timeout: number = 1000 ): Promise<Buffer> {

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
    this.writeRaw( Buffer.from( this.getLineStart() + line + this.getLineEnd() ) )
  }

  writeStatus( sts: ATCmd.Status ) {
    if ( sts === ATCmd.Status.OK ) {
      this.writeLine( this.verbose ? 'OK' : '0' );
    } else {
      this.writeLine( this.verbose ? 'ERROR' : '4' );
    }
  }

  registerCommand( atCmd: ATCmd ) {
    this.commands.push( atCmd );
  }

  registerCommands( atCmds: ATCmd[] ) {
    this.commands.push( ...atCmds );
  }

}

export class ATCmd {

  private regExp: RegExp;
  private cmdHandler: ATCmd.Handler;

  constructor( regExp: RegExp, cmdHandler: ATCmd.Handler ) {
    this.regExp = regExp;
    this.cmdHandler = cmdHandler;
  }

  test( at: ATInterface, cmdStr: string ): null | Promise<ATCmd.Status> {
    const match = cmdStr.match( this.regExp )
    if ( match ) {
      return this.cmdHandler( at, match );
    }
    return null;
  }

}

export namespace ATCmd {
  
  export enum Status {
    OK,
    ERR,
    UNK,
  };
  
  export type Handler = ( at: ATInterface, str: string[] ) => Promise<Status>
}