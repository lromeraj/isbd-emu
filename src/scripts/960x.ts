import colors from "colors";
import logger from "../logger";
import { SerialPort } from "serialport"
import { Argument, Command, Option, program } from "commander";
import { Modem } from "../iridium/su/960x";
import { MOTransport } from "../iridium/gss/transport";
import { SMTPTransport } from "../iridium/gss/transport/smtp";
import { TCPTransport } from "../iridium/gss/transport/tcp";

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

  const moTransports: MOTransport[] = []

  if ( opts.smtpUser && opts.smtpHost ) {

    const smtpOpts = {
      host: opts.smtpHost,
      port: opts.smtpPort,
      user: opts.smtpUser,
      password: opts.smtpPassword,
      to: opts.smtpTo,
    } as SMTPTransport.Options;
    
    moTransports.push( new SMTPTransport( smtpOpts ) );
  }

  if ( opts.tcpHost && opts.tcpPort ) {
    const tcpOpts: TCPTransport.Options = {
      host: opts.tcpHost,
      port: opts.tcpPort,
    }
    moTransports.push( new TCPTransport( tcpOpts ) );
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


