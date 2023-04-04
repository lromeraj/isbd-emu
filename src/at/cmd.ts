import type { ATInterface } from "./interface";

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

  test( at: ATInterface, cmdStr: string ): undefined | Promise<void> {

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
  
  export type Handler = ( at: ATInterface, match: string[] ) => Promise<void>

}