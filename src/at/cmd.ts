import * as logger from "../logger";
import type { ATInterface } from "./interface";

const log = logger.create( 'at-cmd' );

export class ATCmd<ContextType> {

  readonly name: string;
  private regExp: RegExp;
  private context: ContextType;

  private cmdHandlers: { 
    onSet?: ATCmd.Handler<ContextType>,
    onTest?: ATCmd.Handler<ContextType>,
    onRead?: ATCmd.Handler<ContextType>,
    onExec?: ATCmd.Handler<ContextType>,
  } = { }

  constructor( name: string, context: ContextType ) {
    
    this.name = name;
    this.context = context;

    this.regExp = new RegExp( `^(at${
      this.name.replace( /[/$&*+#]/g, '\\$&' )
    })(\\=\\?|\\=|\\?)?(.*)\r$`, 'i' );

  }

  /**
   * Fully qualified name
   */
  get fqn() {
    return 'AT' + this.name.toUpperCase();
  }

  private testHandler(
    handler: ATCmd.Handler<ContextType> | undefined, 
    at: ATInterface, 
    strParam: string
  ) {

    if ( handler ) {

      if ( !handler.regexp && strParam === '' ) {
        return handler.callback.apply( this.context, [ at, [] ] )
      } else if ( handler.regexp ) {

        const paramMatch = strParam.match( handler.regexp );
        return paramMatch 
          ? handler.callback.apply( this.context, [ at, paramMatch ] )
          : undefined

      }

    }

    return undefined;
  }

  test(
    at: ATInterface, cmdStr: string
  ): undefined | Promise<string | number | void> {

    const match = cmdStr.match( this.regExp )

    if ( match ) {

      const [ _cmd, _name, type, strParam ] = match;

      if ( type === '?' ) {
        return this.testHandler( this.cmdHandlers.onRead, at, strParam );
      } else if ( type === '=?' ) {
        return this.testHandler( this.cmdHandlers.onTest, at, strParam );
      } else if ( type === '=' ) {
        return this.testHandler( this.cmdHandlers.onSet, at, strParam );
      } else if ( type === undefined ) {
        return this.testHandler( this.cmdHandlers.onExec, at, strParam );
      }

    }

    return undefined;
  }

  onExec( handler: ATCmd.HandlerCallback<ContextType> ): this;
  onExec( regExp: RegExp, handler: ATCmd.HandlerCallback<ContextType> ): this;
  onExec( 
    regExpOrCallback?: RegExp | ATCmd.HandlerCallback<ContextType>, 
    callback?: ATCmd.HandlerCallback<ContextType> 
  ): this {
    
    if ( regExpOrCallback instanceof RegExp 
        && typeof callback === 'function' ) {
      this.cmdHandlers.onExec = { 
        callback,
        regexp: regExpOrCallback,
      };
    } else if ( typeof regExpOrCallback === 'function' ) {
      this.cmdHandlers.onExec = {
        regexp: undefined, 
        callback: regExpOrCallback,
      };
    }

    return this;
  }

  onRead( callback: ATCmd.HandlerCallback<ContextType> ) {
    this.cmdHandlers.onRead = { callback };
    return this;
  }

  onSet( regexp: RegExp, callback: ATCmd.HandlerCallback<ContextType> ) {
    this.cmdHandlers.onSet = { regexp, callback };
    return this;
  }

  onTest( callback: ATCmd.HandlerCallback<ContextType> ) {
    this.cmdHandlers.onTest = { callback };
    return this;
  }

  static wrapContext<T = undefined>(
    name: string,
    callback: ( cmd: ATCmd<T> ) => void
  ): ATCmd.ContextWrapper<T> {

    return ( ctx: T ) => {
      const cmd = new ATCmd<T>( name, ctx ) 
      callback( cmd )
      return cmd
    }

  } 

}

export namespace ATCmd {
  
  export enum Status {
    OK,
    ERR,
  };

  export interface Handler<ContextType> {
    callback: HandlerCallback<ContextType>;
    regexp?: RegExp;
  }

  export type HandlerCallback<ContextType> = ( 
    this: ContextType, at: ATInterface, match: string[] 
  ) => Promise<string | number | void>

  export type ContextWrapper<T> = ( context: T ) => ATCmd<T>

}