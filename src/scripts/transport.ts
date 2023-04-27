#!/usr/bin/node

import fs from "fs-extra";
import colors from "colors";
import logger from "../logger"
import { Argument, Command, Option, program } from "commander";
import { Message } from "../gss/msg";
import { TCPTransport } from "../gss/transport/tcp";
import { decodeMoMessage, decodeMtMessage } from "../gss/msg/decoder";
import { encodeMoMsg, encodeMtMessage } from "../gss/msg/encoder";
import { Readable, Stream } from "stream";
import { ReadStream } from "fs";

program
  .version( '0.0.3' )
  .description( 'Iridium SBD message transporter' )

program.addArgument( 
  new Argument( '[file]', 'JSON message file' ) );

program.addOption(
  new Option( '--tcp-host <string>', 'TCP transport host' )
    .default( 'localhost' ) )

program.addOption(
  new Option( '--tcp-port <number>', 'TCP transport port' )
    .default( 10800 ).argParser( v => parseInt( v ) ) )


function sendMtMessage( transport: TCPTransport, reqBuff: Buffer ) {

  logger.info( `Sending MT message ...` );

  return transport.sendBuffer( reqBuff, { 
    waitResponse: true
  }).then( respBuf => {

    const mtMsg = decodeMtMessage( respBuf );

    if ( mtMsg && mtMsg.confirmation ) {

      const outFileName = `MTC_${ 
        mtMsg.confirmation.imei 
      }_${ 
        mtMsg.confirmation.autoid 
      }.sbd`
      
      return fs.writeFile( outFileName, respBuf ).then( () => {

        logger.info( `MT confirmation message written into ${ 
          colors.green( outFileName ) 
        }` );

      }).catch( err => {
        logger.error( `Could not write MT confirmation message => ${ err.message }`)
      })

    } else {
      logger.error( `Could not decode MT confirmation message` );
    }

  }).catch( err => {
    logger.error( `Could not send message => ${ err.message }` );
  })

}

async function main() {
  program.parse();

  const programArgs = program.args;
  const opts = program.opts();

  const [ srcFilePath ] = programArgs;
  
  let inputStream: Readable;

  if ( srcFilePath ) {
    inputStream = fs.createReadStream( srcFilePath );
  } else if ( !process.stdin.isTTY ) {
    inputStream = process.stdin;
  } else {
    logger.error( `No input was given` );
    process.exit( 1 );
  }

  const transport = new TCPTransport({
    host: opts.tcpHost,
    port: opts.tcpPort,
  })

  const chunks: Buffer[] = [];

  inputStream.on( 'error', err => {
    logger.error( `Read error => ${ err.message }` );
  })

  inputStream.on( 'data', chunk =>  {
    chunks.push( chunk );
  })

  inputStream.on( 'end', () => {

    const buffer = Buffer.concat( chunks );
    const decoders = [ decodeMoMessage, decodeMtMessage ];

    for ( let decoder of decoders ) {
      
      const message = decoder( buffer );

      if ( decoder( buffer ) ) {
        if ( decoder === decodeMtMessage ) {
          sendMtMessage( transport, buffer );
        }
        break;
      }

    }

  })

  
}



main();