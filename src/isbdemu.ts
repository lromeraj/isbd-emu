import colors from "colors";
import logger from "./logger";
import { SerialPort } from "serialport"
import { Argument, Command, Option, program } from "commander";
import { ATCmd } from "./at/cmd";
import { ATInterface } from "./at/interface";
import { Modem } from "./isbd/modem";

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

  const sp = new SerialPort({ 
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

  const modem = new Modem({
    imei: opts.imei,
    serialPort: sp,
  });

}

main();


