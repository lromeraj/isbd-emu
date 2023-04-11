import colors from "colors";
import logger from "../logger";
import { SerialPort } from "serialport"
import { Argument, Command, Option, program } from "commander";
import { Modem } from "../iridium/su/960x";
import { MOTransport } from "../iridium/gss/transport";
import { SMTPTransport } from "../iridium/gss/transport/smtp";
import { TCPTransport } from "../iridium/gss/transport/tcp";
import { GSS } from "../iridium/gss";

program
  .version( '0.0.2' )
  .description( 'A simple emulator for Iridium GSS' )

program.addOption(
  new Option( '--mo-smtp-host <string>', 'MO SMTP transport host' ) )

program.addOption(
  new Option( '--mo-smtp-port <number>', 'MO SMTP transport port' )
    .default( 25 ).argParser( v => parseInt( v ) ) )

program.addOption(
  new Option( '--mo-smtp-user <string>', 'MO SMTP transport username' ) )

program.addOption(
  new Option( '--mo-smtp-password <string>', 'MO SMTP transport password' ) )

program.addOption(
  new Option( '--mo-smtp-to <string>', 'MO SMTP transport destination address' ) )

program.addOption(
  new Option( '--mo-tcp-host <string>', 'MO TCP transport host' ) )

program.addOption(
  new Option( '--mo-tcp-port <number>', 'MO TCP transport port' )
    .default( 10800 ).argParser( v => parseInt( v ) ) )

program.addOption(
  new Option( '--mt-server-port <number>', 'MT server port' )
    .default( 10800 ).argParser( v => parseInt( v ) ) )

program.addOption(
  new Option( '--su-server-port <number>', 'SU server port' )
    .default( 10801 ).argParser( v => parseInt( v ) ) )

// program.addOption(
//   new Option( '--socket-host <string>', 'Socket server host' ) )

async function main() {

  program.parse();
  const opts = program.opts();

  const moTransports: MOTransport[] = []

  if ( opts.moSmtpUser && opts.moSmtpHost ) {

    const smtpOpts = {
      host: opts.moSmtpHost,
      port: opts.moSmtpPort,
      user: opts.moSmtpUser,
      password: opts.moSmtpPassword,
      to: opts.moSmtpTo,
    } as SMTPTransport.Options;
    
    moTransports.push( new SMTPTransport( smtpOpts ) );
  }

  if ( opts.moTcpHost && opts.moTcpPort ) {
    const tcpOpts: TCPTransport.Options = {
      host: opts.moTcpHost,
      port: opts.moTcpPort,
    }
    moTransports.push( new TCPTransport( tcpOpts ) );
  }

  if ( moTransports.length === 0 ) {
    logger.warn( `No MO transports defined` );
  }

  const gss = new GSS({ // gss instance
    moTransports,
    mtServerPort: opts.mtServerPort,
    isuServerPort: opts.suServerPort,
  })

}

main();


