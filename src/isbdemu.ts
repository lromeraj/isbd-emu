import colors from "colors";
import logger from "./logger";
import { SerialPort } from "serialport"
import { Argument, Command, Option, program } from "commander";
import { ATCmd } from "./at/cmd";
import { ATInterface } from "./at/interface";
import { validateMsg, readBinMsg } from "./isbd";

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

  const CMD_IMEI = new ATCmd( '+cgsn' )
    .onExec( null, async at => {
      at.writeLine( opts.imei );
    })
  
  /**
   * Transfer mobile terminated originated buffer 
   * to mobile terminated buffer
   */
  const CMD_SBDTC = new ATCmd( '+sbdtc' )
    .onExec( null, async ( at, match ) => {
      mtData = { ... moData };
    })

  /**
   * Read mobile terminated buffer
   */
  const CMD_SBDRB = new ATCmd( '+sbdrb' )
    .onExec( null, async at => {
      
      let offset = 0;

      // LENGTH (2 bytes) + MESSAGE (LENGTH bytes) + CHECKSUM (2 bytes)
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

    })

  const CMD_SBDWB = new ATCmd( '+sbdwb' )
    .onSet( /\d+/, async ( at, match ) => {
      
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
      
        return readBinMsg( at, payloadLength )
          .then( ({ payload, checksum }) => {

          if ( validateMsg( payload, checksum ) ) { // message is valid
          
            moData.buffer = payload;
            moData.checksum = checksum;

            at.writeLine( code.OK );

          } else {
            at.writeLine( code.ERR_CHECKSUM );
          }

        }).catch( err => { // timeout error
          at.writeLine( code.ERR_TIMEOUT );
        })

      }

    })

  atInterface.registerCommands([
    CMD_IMEI,
    CMD_SBDWB,
    CMD_SBDTC,
    CMD_SBDRB,
  ])

}

main();


