import colors from "colors";
import logger from "../logger";
import { Argument, Command, Option, program } from "commander";
import { Modem } from "../iridium/su/960x";

program
  .version( '0.0.5' )
  .description( 'A simple emulator for Iridium SBD 960X transceivers' )

program.addOption( // TODO: rename
  new Option( '-p, --path <string>', 'serial port path' )
    .makeOptionMandatory() )

program.addOption( 
  new Option( '-i, --imei <string>', 'set ISU IMEI' )
    .default( '527695889002193' ) )

program.addOption(
  new Option( '--gss-host <string>', 'GSS Socket host' )
    .default( 'localhost' ) )

program.addOption(
  new Option( '--gss-port <string>', 'GSS Socket port' )
    .default( 10801 ).argParser( v => parseInt( v ) ) )

program.addOption(
  new Option( '--gss-uri <string>', 'GSS Socket URI' )
  .conflicts([ 'gssPort', 'gssHost' ]) )

async function main() {

  program.parse();
  const opts = program.opts();

  if ( !/[0-9]{15}/.test( opts.imei ) ) {
    logger.error( `Given IMEI is not valid` );
    process.exit( 1 );
  }

  const modem = new Modem({
    gss: {
      port: opts.gssPort,
      host: opts.gssHost,
    },
    dte: {
      path: opts.path,
    },
    imei: opts.imei,
  });

}

main();

