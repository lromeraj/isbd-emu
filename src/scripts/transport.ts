#!/usr/bin/node

import fs from "fs-extra";
import colors from "colors";
import  * as logger from "../logger"
import { Argument, Command, Option, program } from "commander";
import { Message, msgToJSON } from "../gss/msg";
import { TCPTransport } from "../gss/transport/tcp";
import { decodeMoMessage, decodeMtMessage } from "../gss/msg/decoder";
import { encodeMoMsg, encodeMtMessage } from "../gss/msg/encoder";
import { Readable, Stream } from "stream";
import { ReadStream } from "fs";
import { collectInputStream } from "./utils";

const log = logger.create( 'main' );

program
  .version( '0.0.2' )
  .description( 'Iridium SBD message transporter' )

program.addArgument( 
  new Argument( '[file]', 'SBD binary message file' ) );

program.addOption(
  new Option( '--tcp-host <string>', 'TCP transport host' )
    .default( 'localhost' ) )

program.addOption(
  new Option( '--tcp-port <number>', 'TCP transport port' )
    .default( 10800 ).argParser( v => parseInt( v ) ) )

function writeMtConfirmation( mtConfirm: Message.MT.Confirmation, buffer: Buffer ) {

  if ( process.stdout.isTTY ) {
        
    const outFileName = `MTC_${ 
      mtConfirm.imei
    }_${ 
      mtConfirm.autoid 
    }.sbd`

    fs.writeFile( outFileName, buffer ).then( () => {

      log.success( `MT confirmation message written to ${ 
        colors.green( outFileName ) 
      }` );

    }).catch( err => {
      log.error( `Could not write MT confirmation message => ${ err.message }`)
    })

  } else {
    log.success( `MT confirmation received` );
    process.stdout.write( buffer );
  }

}

function processMtMessage( transport: TCPTransport, mtReqBuff: Buffer ) {

  log.info( `Sending MT message ...` );

  return transport.sendBuffer( mtReqBuff, {
    waitResponse: true
  }).then( mtRespBuff => {

    const mtMsg = decodeMtMessage( mtRespBuff );

    if ( mtMsg && mtMsg.confirmation ) {
      writeMtConfirmation( mtMsg.confirmation, mtRespBuff );
    } else {
      log.error( `Could not decode MT confirmation message` );
    }

  }).catch( err => {
    log.error( `Could not send message => ${ err.message }` );
  })

}

function processMoMessage( transport: TCPTransport, reqBuff: Buffer ) {

  log.info( `Sending MO message ...` );

  return transport.sendBuffer( reqBuff ).then(() => {
    log.info( `MO message sent` );
  }).catch( err => {
    log.error( `Could not send MO message => ${ err.message }` );
  })

}


async function main() {
  
  program.parse();
  
  const programArgs = program.args;
  const opts = program.opts();

  logger.setProgramName( 'transport' );
  
  if ( !process.stdout.isTTY ) {
    logger.disableTTY();
  }
  
  let inputStream: Readable;
  const [ srcFilePath ] = programArgs;

  if ( srcFilePath ) {
    inputStream = fs.createReadStream( srcFilePath );
  } else {
    inputStream = process.stdin;
  }

  collectInputStream( inputStream ).then( buffer => {

    const transport = new TCPTransport({
      host: opts.tcpHost,
      port: opts.tcpPort,
    })

    let decodedMsg: Message | null = null

    if ( ( decodedMsg = decodeMtMessage( buffer ) ) ) {
      // const mtMsg = decodedMsg as Message.MT;
      processMtMessage( transport, buffer );
    } else if ( ( decodedMsg = decodeMoMessage( buffer ) )) {
      // const moMsg = decodedMsg as Message.MO;
      processMoMessage( transport, buffer );
    } else {
      log.error( `Input message not recognized` );
    }

  }).catch( err => {
    log.error( `Read error => ${ err.message }` );
  })
  
}



main();