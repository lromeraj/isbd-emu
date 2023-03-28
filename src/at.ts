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

  constructor( sp: SerialPort ) {
    
    this.sp = sp;

    let cmdStr = '';
    let cmdMask = 'at';

    this.sp.on( 'data', ( buffer: Buffer ) => {
      
      if ( this.status === ATIStatus.WAITING ) {
        
        buffer.forEach( byte => {
          
          let addByte = true;

          if ( cmdStr.length < cmdMask.length ) {
            if ( String.fromCharCode( byte ).toLowerCase() !== cmdMask.charAt( cmdStr.length ) ) {
              addByte = false;
            }
          } 
          
          if ( addByte ) {

            cmdStr += String.fromCharCode( byte );
            
            if ( this.echo ) {
              this.sp.write( byte );
            }

            if ( byte === 13 ) {
              this.processCommand( cmdStr );
              cmdStr = '';
            }

          }

        })

      }

    })

  }

  private processCommand( atCmdStr: string ) {

    let commandFound = false;
    this.status = ATIStatus.PROCESSING;
    
    let atCmdStrFiltered = atCmdStr.replace( /^AT|\r$/ig, '' );
    
    logger.debug( `Processing command ${ colors.bold.magenta( atCmdStrFiltered ) } ...` )

    for ( let cmd of this.commands ) {
      if ( cmd.test( this, atCmdStrFiltered ) !== null ) {
        break;
      }
    }

    if ( !commandFound ) {
      this.writeStatus( ATCmd.Status.AT_ERR );
    }

    this.status = ATIStatus.WAITING;
  }

  private getLineStart() {
    return this.verbose ? '\r\n' : '';
  }

  private getLineEnd() {
    return this.verbose ? '\r\n' : '\r';
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
      at.writeStatus( cmdSts );
      return cmdSts;
    }

    return null;
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