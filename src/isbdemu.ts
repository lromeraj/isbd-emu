import colors from "colors";
import logger from "./logger";
import { SerialPort } from "serialport"
import { Argument, Command, Option, program } from "commander";
import { ATCmd, ATInterface } from "./at";
import { checkMBCS, readMB } from "./isbd";

program
  .version( '0.0.1' )
  .description( 'A simple emulator for Iridium SBD 9602/9602 transceivers' )

program.addOption( 
  new Option( '-p, --path <string>', 'Serial port path' )
    .makeOptionMandatory() )

program.addOption( 
  new Option( '-i, --imei <string>', 'Set device IMEI' )
    .default( '527695889002193' ) )

async function main() {

  program.parse();

  const opts = program.opts();

  const serialport = new SerialPort({ 
    path: opts.path, 
    baudRate: 19200,
    autoOpen: true,
  }, err => {
    if ( err ) {
      logger.error( err.message )
      process.exit( 1 );
    } else {
      logger.success( `Modem is ready` )
    }
  })

  let moData = {
    checksum: 0,
    buffer: Buffer.from([]),
  }

  let mtData = {
    checksum: 0,
    buffer: Buffer.from([]),
  }

  const atInterface = new ATInterface( serialport );

  const CMD_AT = new ATCmd( /^$/i, async ( at, match ) => {
    return ATCmd.Status.OK;
  })

  const CMD_QUIET = new ATCmd( /^q[01]{0,1}$/i, async ( at, match ) => {
    return ATCmd.Status.OK;
  })

  const CMD_ECHO = new ATCmd( /^e([01]){0,1}$/i, async ( at, match ) => {
    at.setEcho( match[ 1 ] 
      ? Boolean( parseInt( match[ 1 ] ) ) 
      : true )
    return ATCmd.Status.OK;
  })

  const CMD_VERBOSE = new ATCmd( /^v([01]){0,1}$/i, async ( at, match ) => {
    at.setVerbose( match[ 1 ] 
      ? Boolean( parseInt( match[ 1 ] ) ) 
      : true )
    return ATCmd.Status.OK;
  })

  const CMD_FLOW_CONTROL = new ATCmd( /^\&k([03]){0,1}$/i, async ( at, match ) => {
    
    const opt = match[ 1 ] 
      ? parseInt( match[ 1 ] ) 
      : 3;
    
    at.setFlowControl( opt === 3 );

    return ATCmd.Status.OK;
  })

  const CMD_DTR = new ATCmd( /^\&d([0-3]){0,1}/i, async ( at, match ) => {
    const opt = match[ 1 ] 
      ? parseInt( match[ 1 ] ) 
      : 2;
    return ATCmd.Status.OK;
  })

  const CMD_IMEI = new ATCmd( /^\+cgsn$/i, async ( at, match ) => {
    at.writeLine( opts.imei );
    return ATCmd.Status.OK;
  })

  const CMD_SBDWB = new ATCmd( /^\+sbdwb=([0-9]){1,3}$/i, ( at, match ) => {

    const payloadLength = parseInt( match[ 1 ] )

    if ( payloadLength < 1 || payloadLength > 340 ) {
      at.writeLine( '3' );
    } else {

      at.writeLine( 'READY' );

      return readMB( at, payloadLength ).then( ({ payload, checksum }) => {

        if ( checkMBCS( payload, checksum ) ) { // message is valid
        
          moData.buffer = payload;
          moData.checksum = checksum;

          at.writeLine( '0' );

        } else {
          at.writeLine( '2' );
        }

        return ATCmd.Status.OK;

      }).catch( err => { // timeout error
        at.writeLine( '1' );
        return ATCmd.Status.OK;
      })

    }

    return Promise.resolve( ATCmd.Status.OK );
  })

  atInterface.registerCommands([
    CMD_AT,
    CMD_QUIET,
    CMD_ECHO,
    CMD_DTR,
    CMD_FLOW_CONTROL,
    CMD_IMEI,
    CMD_VERBOSE,
    CMD_SBDWB,
  ])

}

main();


