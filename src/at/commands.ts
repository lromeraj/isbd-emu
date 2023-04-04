import logger from "../logger";
import { ATCmd } from "./cmd";
import { ATInterface } from "./interface";

export const CMD_AT = new ATCmd<any>()
  .onExec( null, async at => { });

export const CMD_QUIET = new ATCmd<any>( 'q' )
  .onExec( /^[01]?$/, async ( at, match ) => {
    console.log( match );
    logger.warn( "ATQ not implemented" );
  })

export const CMD_ECHO = new ATCmd<any>( 'e' )
  .onExec( /^[01]?$/, async ( at, match ) => {
    at.setEcho( 
      Boolean( parseInt( match[ 0 ] || '1' ) ) )
  })

export const CMD_VERBOSE = new ATCmd<any>( 'v' )
  .onExec( /^[01]?$/i, async ( at, match ) => {
    at.setVerbose( 
      Boolean( parseInt( match[ 0 ] || '1' ) ) )
  })

export const CMD_DTR = new ATCmd<any>( '&d' )
  .onExec( /^[0-3]?$/, async ( at, match ) => {
    const opt = parseInt( match[ 0 ] || '2' ) 
  })

export const CMD_FLOW_CONTROL = new ATCmd<any>( '&k' )
  .onExec( /^[03]?$/, async ( at, match ) => { 
    const opt = parseInt( match[ 0 ] || '3' );
    at.setFlowControl( opt === 3 );
  })

