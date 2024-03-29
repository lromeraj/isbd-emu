import colors from "colors";
import * as logger from "../logger";
import { Argument, Command, Option, program } from "commander";
import { Transport } from "../gss/transport";
import { SMTPTransport } from "../gss/transport/smtp";
import { TCPTransport } from "../gss/transport/tcp";
import { GSS } from "../gss";
import { logLevelOption } from "./cmd";

const log = logger.create( __filename );

program
  .version( '0.0.3' )
  .description( 'A simple emulator for Iridium SBD GSS' )
  
program.addOption( logLevelOption );

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
  new Option( '--mo-tcp-host <string>', 'MO TCP transport host' )
    .default( 'localhost' ) )

program.addOption(
  new Option( '--mo-tcp-port <number>', 'MO TCP transport port' )
    .default( 10801 ).argParser( v => parseInt( v ) ) )

program.addOption(
  new Option( '--mt-server-port <number>', 'MT server port' )
    .default( 10800 ).argParser( v => parseInt( v ) ) )

program.addOption(
  new Option( '--mo-server-port <number>', 'MO server port' )
    .default( 10802 ).argParser( v => parseInt( v ) ) )

async function main() {

  program.parse();
  const opts = program.opts();

	logger.setLevel( opts.logLevel );

  const transports: Transport[] = []

  let smtpTransport: SMTPTransport | undefined = undefined;

  if ( opts.moSmtpUser && opts.moSmtpHost ) {

    const smtpOpts = {
      host: opts.moSmtpHost,
      port: opts.moSmtpPort,
      user: opts.moSmtpUser,
      password: opts.moSmtpPassword,
      to: opts.moSmtpTo,
    } as SMTPTransport.Options;
    
    smtpTransport = new SMTPTransport( smtpOpts )
    transports.push( smtpTransport );

  }

  let tcpTransport: TCPTransport | undefined = undefined;

  if ( opts.moTcpHost && opts.moTcpPort ) {
    
    const tcpOpts: TCPTransport.Options = {
      host: opts.moTcpHost,
      port: opts.moTcpPort,
    }

    tcpTransport = new TCPTransport( tcpOpts );
    transports.push( tcpTransport );
    
  }

  if ( transports.length === 0 ) {
    log.warn( `No MO transports defined` );
  } else {

    if ( tcpTransport ) {
      log.info( `Using MO TCP transport: ${
        colors.green( opts.moTcpHost )
      }:${
        colors.yellow( opts.moTcpPort )
      }` )
    }

    if ( smtpTransport ) {
      log.info( `Using MO SMTP transport: ${
        colors.green( opts.moSmtpHost )
      }:${
        colors.yellow( opts.moSmtpPort )
      }` )
    }
  }

  const gss = new GSS({ // gss instance
    transports: transports,
    mtServer: {
      port: opts.mtServerPort,
      transport: tcpTransport,
    },
    moServer: {
      port: opts.moServerPort
    },
  })

  // console.log( fs.readFileSync( path.join( __dirname, '../../ascii/gss.txt' ), 'ascii' ) )

}

main();


