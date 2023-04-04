import type { ATInterface } from "./interface";

export class ATCmd<ContextType = undefined> {

  private name: string;
  private regExp: RegExp;

  private cmdHandlers: { 
    onTest?: { handler: ATCmd.Handler<ContextType> },
    onRead?: { handler: ATCmd.Handler<ContextType> },
    onSet?: { regexp: RegExp, handler: ATCmd.Handler<ContextType> },
    onExec?: { regexp?: RegExp, handler: ATCmd.Handler<ContextType> },
  } = { }

  constructor( name?: string ) {
    
    this.name = name || '';

    if ( !this.name ) {
      this.regExp = /^(at)$/i
    } else {
      this.regExp = new RegExp( `^(at${
        this.name.replace( /[/$&*+]/g, '\\$&' )
      })(\\=\\?|\\=|\\?)?(.*)$`, 'i' );
    }

  }

  test( 
    at: ATInterface<ContextType>, cmdStr: string, context: ContextType 
  ): undefined | Promise<void> {

    const match = cmdStr.match( this.regExp )

    if ( match ) {

      const cmdHandlers = this.cmdHandlers;
      const [ _, _name, type, param ] = match;
      
      if ( type === '?' && cmdHandlers.onRead ) {
        return cmdHandlers.onRead.handler.apply( context, [ at, [] ] );
      } else if ( type === '=?' && cmdHandlers.onTest ) {
        return cmdHandlers.onTest.handler.apply( context, [ at, [] ] );
      } else if ( type === '=' && cmdHandlers.onSet ) {
        
        const match = param.match( cmdHandlers.onSet.regexp );
        return match 
          ? cmdHandlers.onSet.handler.apply( context, [ at, match ] ) 
          : undefined; 

      } else if ( type === undefined && cmdHandlers.onExec ) {

        if ( cmdHandlers.onExec.regexp ) {
          
          const paramMatch = param.match( cmdHandlers.onExec.regexp );

          return paramMatch
            ? cmdHandlers.onExec.handler.apply( context, [ at, paramMatch ] )
            : undefined;

        } else {
          return cmdHandlers.onExec.handler.apply( context, [ at, [] ] );
        }

      }

    }

    return undefined;
  }

  onExec( regexp: RegExp | null, handler: ATCmd.Handler<ContextType> ) {
    this.cmdHandlers.onExec = { 
      handler,
      regexp: regexp || undefined, 
    };
    return this;
  }

  onRead( handler: ATCmd.Handler<ContextType> ) {
    this.cmdHandlers.onRead = { handler };
    return this;
  }

  onSet( regexp: RegExp, handler: ATCmd.Handler<ContextType> ) {
    this.cmdHandlers.onSet = { regexp, handler };
    return this;
  }

  onTest( handler: ATCmd.Handler<ContextType> ) {
    this.cmdHandlers.onTest = { handler };
    return this;
  }

}

export namespace ATCmd {
  
  export enum Status {
    OK,
    ERR,
  };
  
  export type Handler<T> = (this: T, at: ATInterface<T>, match: string[] ) => Promise<void>

}