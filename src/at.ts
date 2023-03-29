import colors from "colors";
import logger from "./logger";
import { SerialPort } from "serialport";

enum ATIStatus {
  WAITING,
  PROCESSING,
};

export class ATInterface {

  private sp: SerialPort;
  private commands: ATCmd[] = [];
  private status: ATIStatus = ATIStatus.WAITING;

  private echo: boolean = false;
  private quite: boolean = false;
  private verbose: boolean = true;

  private atCmdStr = '';
  private atCmdMask = 'AT';

  
  constructor( sp: SerialPort ) {
    
    this.sp = sp;

    this.sp.on( 'data', ( buffer: Buffer ) => {
      if ( this.status === ATIStatus.WAITING ) {
        this.waitCommand( buffer );
      }
    })

  }

  private stringifyCmd( atCmdStr: string ) {
    return atCmdStr
      .replace( /\r/g, '\\r' )
      .replace( /\n/g, '\\n' );
  }

  private waitCommand( buffer: Buffer ) {

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



    let cmdSts = ATCmd.Status.AT_UNK;
    let atCmdStrFiltered = atCmdStr.replace( /^AT|\r$/ig, '' );

    logger.debug( `Processing command ${ 
      colors.green( atCmdStrFiltered ) 
    } ...` )

    for ( let cmd of this.commands ) {
      cmdSts = cmd.test( this, atCmdStrFiltered );
      if ( cmdSts !== ATCmd.Status.AT_UNK ) {
        break;
      }
    }

    this.writeStatus( cmdSts );
    this.status = ATIStatus.WAITING;
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
      logger.info( `Flow control has been enabled` );
    } else {
      logger.info( `Flow control has been disabled` );
    }
  }

  setEcho( echo: boolean ) {
    this.echo = echo;
    if ( echo ) {
      logger.info( `Echo has been enabled` );
    } else {
      logger.info( `Echo has been disabled` );
    }
  }

  setVerbose( verbose: boolean ) {
    this.verbose = verbose;
    if ( verbose ) {
      logger.info( `Verbose mode has been enabled` );
    } else {
      logger.info( `Verbose mode has been disabled` );
    }
  }

  writeRaw( buffer: Buffer ) {
    this.sp.write( buffer );
    this.sp.drain();
  }

  writeLine( line: string ) {
    this.writeRaw( Buffer.from( this.getLineStart() + line + this.getLineEnd() ) )
  }

  writeStatus( sts: ATCmd.Status ) {
    if ( sts === ATCmd.Status.AT_OK ) {
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

  test( at: ATInterface, cmdStr: string ) {

    const match = cmdStr.match( this.regExp )
    
    if ( match ) {
      const cmdSts = this.cmdHandler( at, match );
      return cmdSts;
    }

    return ATCmd.Status.AT_UNK;
  }

}


export namespace ATCmd {
  
  export enum Status {
    AT_OK,
    AT_ERR,
    AT_UNK,
  }
  
  export type Handler = ( at: ATInterface, str: string[] ) => Status
}


export function buildResponse( msg: Buffer ) {
}