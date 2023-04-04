import { ATCmd } from "./cmd";


export const CMD_AT = new ATCmd()
  .onExec( null, async at => { });

export const CMD_QUIET = new ATCmd( 'q' )
  .onExec( /[01]?/, async ( at, match ) => { })

export const CMD_ECHO = new ATCmd( 'e' )
  .onExec( /[01]?/, async ( at, match ) => {
    at.setEcho( 
      Boolean( parseInt( match[ 0 ] || '1' ) ) )
  })

export const CMD_VERBOSE = new ATCmd( 'v' )
  .onExec( /[01]?/i, async ( at, match ) => {
    at.setVerbose( 
      Boolean( parseInt( match[ 0 ] || '1' ) ) )
  })

export const CMD_FLOW_CONTROL = new ATCmd( '&k' )
  .onExec( /[03]?/, async ( at, match ) => { 
    const opt = parseInt( match[ 0 ] || '3' );
    at.setFlowControl( opt === 3 );
  })

export const CMD_DTR = new ATCmd( '&d' )
  .onExec( /[0-3]?/, async ( at, match ) => {
    const opt = parseInt( match[ 0 ] || '2' ) 
  })