import colors from "colors";
import logger from "../logger";
import { Argument, Command, Option, program } from "commander";
import { Modem } from "../isu/960x";

program
  .version( '0.0.5' )
  .description( 'A simple emulator for Iridium SBD 960X transceivers' )
  .option( '-v, --verbose', 'Verbosity level', 
    (_, prev) => prev + 1, 1 )

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
    .default( 10802 ).argParser( v => parseInt( v ) ) )

program.addOption(
  new Option( '--gss-uri <string>', 'GSS Socket URI' )
  .conflicts([ 'gssPort', 'gssHost' ]) )

async function main() {

  program.parse();
  const opts = program.opts();

  logger.setLevel( opts.verbose );

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


