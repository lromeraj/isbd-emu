import colors, { underline } from "colors";
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

    let atCmdStrFiltered = atCmdStr.replace( /\r$/ig, '' );

    logger.debug( `Processing command ${ 
      colors.green( atCmdStrFiltered ) 
    } ...` )

    for ( let cmd of this.commands ) {
      const promise = cmd.test( this, atCmdStrFiltered );

      if ( promise ) {
        promise.then( sts => {
          this.writeStatus( sts );
        }).catch( err => {
          // TODO: write AT error response ????
          logger.error( `Internal command error => ${ err.stack }` )
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
    this.commands.push( ... atCmds );
  }

}

export class ATCmd {

  private name: string;
  private regExp: RegExp;
  
  private cmdHandlers: { 
    onTest?: { handler: ATCmd.Handler },
    onRead?: { handler: ATCmd.Handler },
    onSet?: { regexp: RegExp, handler: ATCmd.Handler },
    onExec?: { regexp?: RegExp, handler: ATCmd.Handler },
  } = { }

  constructor( name?: string ) {
    
    this.name = name || '';

    if ( !this.name ) {
      this.regExp = /^(at)?$/i
    } else {
      this.regExp = new RegExp( `^(at${
        this.name.replace( /[/$&*+]/g, '\\$&' )
      })(\\=\\?|\\=|\\?)?(.*)$`, 'i' );
    }

  }

  test( at: ATInterface, cmdStr: string ): undefined | Promise<ATCmd.Status> {

    const match = cmdStr.match( this.regExp )
    
    if ( match ) {

      const cmdHandlers = this.cmdHandlers;
      const [ _, _name, type, params ] = match;

      if ( type === '?' && cmdHandlers.onRead ) {
        return cmdHandlers.onRead.handler( at, [] );
      } else if ( type === '=?' && cmdHandlers.onTest ) {
        return cmdHandlers.onTest.handler( at, [] );
      } else if ( type === '=' && cmdHandlers.onSet ) {
        const match = params.match( cmdHandlers.onSet.regexp );
        return match 
          ? cmdHandlers.onSet.handler( at, match ) 
          : undefined; 
      } else if ( type === undefined && cmdHandlers.onExec ) {

        if ( cmdHandlers.onExec.regexp ) {
          
          const match = params.match( cmdHandlers.onExec.regexp );
          return match
            ? cmdHandlers.onExec.handler( at, match )
            : undefined;

        } else {
          return cmdHandlers.onExec.handler( at, [] );
        }

      } else {
        return undefined;
      }

    }

    return undefined;
  }

  onExec( regexp: RegExp | null, handler: ATCmd.Handler ) {
    this.cmdHandlers.onExec = { 
      handler,
      regexp: regexp || undefined, 
    };
    return this;
  }

  onRead( handler: ATCmd.Handler ) {
    this.cmdHandlers.onRead = { handler };
    return this;
  }

  onSet( regexp: RegExp, handler: ATCmd.Handler ) {
    this.cmdHandlers.onSet = { regexp, handler };
    return this;
  }

  onTest( handler: ATCmd.Handler ) {
    this.cmdHandlers.onTest = { handler };
    return this;
  }

}

export namespace ATCmd {
  
  export enum Status {
    OK,
    ERR,
    UNK,
  };
  
  export type Handler = ( at: ATInterface, match: string[] ) => Promise<Status>

}