import colors from "colors";
import logger from "./logger";
import { SerialPort } from "serialport"
import { Argument, Command, Option, program } from "commander";
import { ATCmd, ATInterface } from "./at";

program
  .version( '0.0.1' )
  .description( 'A simple emulator for Iridium SBD 9602/9602 transceivers' )

program.addOption( 
  new Option( '-p, --path <string>', 'Serial port path' ).makeOptionMandatory() )

async function main() {
  
  program.parse();

  const opts = program.opts();

  const serialport = new SerialPort({ 
    path: opts.path, 
    baudRate: 19200,
    autoOpen: true,
  })

  serialport.on( 'error', err => {
    logger.error( err.message )
    process.exit( 1 );
  })

  const atIface = new ATInterface( serialport );

  const atCmd = new ATCmd( /^$/i, ( at, match ) => {
    return ATCmd.Status.AT_OK;
  })

  const quiteCmd = new ATCmd( /^q[01]{0,1}$/i, ( at, match ) => {
    return ATCmd.Status.AT_OK;
  })

  const echoCmd = new ATCmd( /^e([01]){0,1}$/i, ( at, match ) => {
    at.setEcho( match[ 1 ] 
      ? Boolean( parseInt( match[ 1 ] ) ) 
      : true )
    return ATCmd.Status.AT_OK;
  })

  const verboseCmd = new ATCmd( /^v([01]){0,1}$/i, ( at, match ) => {
    at.setVerbose( match[ 1 ] 
      ? Boolean( parseInt( match[ 1 ] ) ) 
      : true )
    return ATCmd.Status.AT_OK;
  })

  const flowControlCmd = new ATCmd( /^\&k([03]){0,1}$/i, ( at, match ) => {
    
    const opt = match[ 1 ] 
      ? parseInt( match[ 1 ] ) 
      : 3;
    
    at.setFlowControl( opt === 3 );

    return ATCmd.Status.AT_OK;
  })

  const dtrCmd = new ATCmd( /^\&d([0-3]){0,1}/i, ( at, match ) => {
    const opt = match[ 1 ] 
      ? parseInt( match[ 1 ] ) 
      : 2;
    return ATCmd.Status.AT_OK;
  })

  const imeiCmd = new ATCmd( /^\+cgsn$/i, ( at, match ) => {
    at.writeLine( "527695889002193" );
    return ATCmd.Status.AT_OK;
  })

  atIface.registerCommands([
    atCmd,
    quiteCmd,
    echoCmd,
    dtrCmd,
    flowControlCmd,
    imeiCmd,
    verboseCmd
  ])

}

main();


