import colors from "colors";
import * as logger from "../logger";
import { Argument, Command, Option, program } from "commander";
import { Modem } from "../isu/960x";
import { logLevelOption } from "./cmd";

program
  .version( '0.0.5' )
  .description( 'A simple emulator for Iridium SBD 960X transceivers' );

program.addOption( logLevelOption );

program.addOption(
  new Option( '-d, --device <string>', 'Serial port path' )
    .makeOptionMandatory() )

program.addOption( 
  new Option( '--imei <string>', 'Configure custom IMEI' )
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

const log = logger.create( __filename );

async function main() {

  program.parse();
  const opts = program.opts();

	logger.setLevel( opts.logLevel );

  if ( !/[0-9]{15}/.test( opts.imei ) ) {
    log.error( `Given IMEI is not valid` );
    process.exit( 1 );
  }

  const modem = new Modem({
    gss: {
      port: opts.gssPort,
      host: opts.gssHost,
    },
    dte: {
      path: opts.device,
    },
    imei: opts.imei,
  });

}

main();


