import colors from "colors";
import logger from "./logger";
import { SerialPort } from "serialport"
import { Argument, Command, Option, program } from "commander";
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

  const modem = new Modem({
    imei: opts.imei,
    dte: {
      path: opts.path,
    },
  });

}

main();


