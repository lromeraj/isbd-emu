import colors from "colors";
import logger from "./logger";
import { SerialPort } from "serialport"
import { Argument, Command, Option, program } from "commander";
import { ATCmd, ATInterface } from "./at";
import { checkMBCS as validateChecksum, readMB as readBinaryMsg } from "./isbd";

program
  .version( '0.0.2' )
  .description( 'A simple emulator for Iridium SBD 9602/9602 transceivers' )

program.addOption( 
  new Option( '-p, --path <string>', 'Serial port path' )
    .makeOptionMandatory() )

program.addOption( 
  new Option( '-i, --imei <string>', 'Customize device IMEI' )
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

  const CMD_AT = new ATCmd()
    .onExec( null, async () => ATCmd.Status.OK );

  const CMD_QUIET = new ATCmd( 'q' )
    .onExec( /[01]?/, async ( at, match ) => {

      return ATCmd.Status.OK;
    })

  const CMD_ECHO = new ATCmd( 'e' )
    .onExec( /[01]?/, async ( at, match ) => {
      at.setEcho( match[ 0 ] 
        ? Boolean( parseInt( match[ 1 ] ) ) 
        : true )
      return ATCmd.Status.OK;
    })

  const CMD_VERBOSE = new ATCmd( 'v' )
    .onExec( /[01]?/i, async ( at, match ) => {
      at.setVerbose( match[ 0 ] 
        ? Boolean( parseInt( match[ 1 ] ) ) 
        : true )
      return ATCmd.Status.OK;
    })

  const CMD_FLOW_CONTROL = new ATCmd( '&k' )
    .onExec( /[03]?/, async ( at, match ) => {
    
      const opt = match[ 0 ] 
        ? parseInt( match[ 0 ] ) 
        : 3;
      
      at.setFlowControl( opt === 3 );

      return ATCmd.Status.OK;
    })

  const CMD_DTR = new ATCmd( '&d' )
    .onExec( /[0-3]?/, async ( at, match ) => {
      const opt = match[ 0 ]
        ? parseInt( match[ 0 ] ) 
        : 2;
      // set flow control accordingly
      return ATCmd.Status.OK;
    })

  const CMD_IMEI = new ATCmd( '+cgsn' )
    .onExec( null, async at => {
      at.writeLine( opts.imei );
      return ATCmd.Status.OK;
    })
  
  /**
   * Transfer mobile terminated originated buffer 
   * to mobile terminated buffer
   */
  const CMD_SBDTC = new ATCmd( '+sbdtc' )
    .onExec( null, async ( at, match ) => {
      mtData = { ... moData };
      return ATCmd.Status.OK;
    })

  /**
   * Read mobile terminated buffer
   */
  const CMD_SBDRB = new ATCmd( '+sbdrb' )
    .onExec( null, async at => {
      
      // LENGTH (2 bytes) + MESSAGE (LENGTH bytes) + CHECKSUM (2 bytes)

      let offset = 0;
      const totalLength = 2 + mtData.buffer.length + 2;
      const buffer = Buffer.alloc( totalLength );

      offset = buffer.writeUint16BE( 
        mtData.buffer.length, offset );
      
      // copy() do not returns an offset, returns the
      // number of bytes copied instead
      offset += mtData.buffer.copy( 
        buffer, offset );
      
      offset = buffer.writeUInt16BE( 
        mtData.checksum, offset );

      at.writeRaw( buffer );

      return ATCmd.Status.OK;
    })

  const CMD_SBDWB = new ATCmd( '+sbdwb' )
    .onSet( /\d+/, ( at, match ) => {
      
      const code = {
        OK            : '0', // everything was ok
        ERR_TIMEOUT   : '1', // data took too much time to arrive
        ERR_CHECKSUM  : '2', // received checksum is not valid
        ERR_LENGTH    : '3', // message length is out of bounds [1, 340]
      };

      const payloadLength = parseInt( match[ 0 ] )

      if ( payloadLength < 1 || payloadLength > 340 ) {
        at.writeLine( code.ERR_LENGTH );
      } else {

        at.writeLine( 'READY' );

        return readBinaryMsg( at, payloadLength )
          .then( ({ payload, checksum }) => {

          if ( validateChecksum( payload, checksum ) ) { // message is valid
          
            moData.buffer = payload;
            moData.checksum = checksum;

            at.writeLine( code.OK );

          } else {
            at.writeLine( code.ERR_CHECKSUM );
          }

          return ATCmd.Status.OK;

        }).catch( err => { // timeout error
          at.writeLine( code.ERR_TIMEOUT );
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
    CMD_SBDTC,
    CMD_SBDRB,
  ])

}

main();


