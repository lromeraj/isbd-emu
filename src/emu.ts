import colors from "colors";
import logger from "./logger";
import { SerialPort } from "serialport"
import { Argument, Command, Option, program } from "commander";
import { Modem } from "./isbd/modem";
import { MOTransport } from "./isbd/transport";
import { SMTPTransport } from "./isbd/transport/smtp";
import { TCPTransport } from "./isbd/transport/tcp";

program
  .version( '0.0.2' )
  .description( 'A simple emulator for Iridium SBD 9602/9602 transceivers' )

program.addOption( // TODO: rename
  new Option( '-p, --path <string>', 'serial port path' )
    .makeOptionMandatory() )

program.addOption( 
  new Option( '-i, --imei <string>', 'customize device IMEI' )
    .default( '527695889002193' ) )

program.addOption(
  new Option( '--smtp-host <string>', 'smtp hostname' ) )

program.addOption(
  new Option( '--smtp-port <number>', 'smtp port' )
    .default( '25' ) )

program.addOption(
  new Option( '--smtp-user <string>', 'smtp username' ) )

program.addOption(
  new Option( '--smtp-password <string>', 'smtp password' ) )

program.addOption(
  new Option( '--smtp-from <string>', 'smtp password' ) )

program.addOption(
  new Option( '--smtp-to <string>', 'smtp password' ) )

program.addOption(
  new Option( '--tcp-host <string>', 'tcp hostname' ) )

program.addOption(
  new Option( '--tcp-port <string>', 'tcp port' ) )

async function main() {

  program.parse();
  const opts = program.opts();

  if ( opts.imei.length !== 15 ) {
    logger.error( `Given IMEI is not valid` );
    process.exit( 1 );
  }

  const moTransports: MOTransport[] = []

  if ( opts.smtpUser && opts.smtpHost ) {

    const smtpOpts = {
      host: opts.smtpHost,
      port: parseInt( opts.smtpPort ),
      user: opts.smtpUser,
      password: opts.smtpPassword,
      from: opts.smtpFrom,
      to: opts.smtpTo,
    } as SMTPTransport.Options;
    
    moTransports.push( new SMTPTransport( smtpOpts ) );
  }

  if ( opts.tcpHost && opts.tcpPort ) {
    const tcpOpts: TCPTransport.Options = {
      host: opts.tcpHost,
      port: parseInt( opts.tcpPort ),
    }
    moTransports.push( new TCPTransport( tcpOpts ) );
  }

  const modem = new Modem({
    gss: {
      moTransports 
    },
    dte: {
      path: opts.path,
    },
    imei: opts.imei,
  });

}

main();


