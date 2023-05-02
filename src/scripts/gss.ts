import colors from "colors";
import * as logger from "../logger";
import { Argument, Command, Option, program } from "commander";
import { Transport } from "../gss/transport";
import { SMTPTransport } from "../gss/transport/smtp";
import { TCPTransport } from "../gss/transport/tcp";
import { GSS } from "../gss";

const log = logger.create( 'main' );

program
  .version( '0.0.2' )
  .description( 'A simple emulator for Iridium GSS' )
  .option( '-v, --verbose', 'Verbosity level', 
    (_, prev) => prev + 1, 1 )

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

  logger.setLevel( opts.verbose );

  const transports: Transport[] = []

  if ( opts.moSmtpUser && opts.moSmtpHost ) {

    const smtpOpts = {
      host: opts.moSmtpHost,
      port: opts.moSmtpPort,
      user: opts.moSmtpUser,
      password: opts.moSmtpPassword,
      to: opts.moSmtpTo,
    } as SMTPTransport.Options;
    
    transports.push( new SMTPTransport( smtpOpts ) );
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


