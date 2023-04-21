/**
 * Default Hayes AT command set
 */
import logger from "../logger";

import { ATCmd } from "./cmd";

export const CMD_AT = new ATCmd( '', undefined )
  .onExec( async at => { } );

export const CMD_QUIET = new ATCmd( 'q', undefined )
  .onExec( /^[01]?$/, async ( at, match ) => {
    at.setQuiet( 
      Boolean( parseInt( match[ 0 ] || '0' ) ) );
  })

export const CMD_ECHO = new ATCmd( 'e', undefined )
  .onExec( /^[01]?$/, async ( at, match ) => {
    at.setEcho( 
      Boolean( parseInt( match[ 0 ] || '0' ) ) )
  })

export const CMD_VERBOSE = new ATCmd( 'v', undefined )
  .onExec( /^[01]?$/i, async ( at, match ) => {
    at.setVerbose( 
      Boolean( parseInt( match[ 0 ] || '0' ) ) )
  })

export const CMD_DTR = new ATCmd( '&d', undefined )
  .onExec( /^[0-3]?$/, async ( at, match ) => {
    const opt = parseInt( match[ 0 ] || '0' ) 
    // TODO: ....
  })

export const CMD_FLOW_CONTROL = new ATCmd( '&k', undefined )
  .onExec( /^[03]?$/, async ( at, match ) => { 
    const opt = parseInt( match[ 0 ] || '0' );
    at.setFlowControl( opt === 3 );
  })
