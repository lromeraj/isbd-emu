#!/usr/bin/node

import fs from "fs-extra";
import colors from "colors";
import * as logger from "../logger"
import { Argument, Command, Option, program } from "commander";
import { decodeMoMessage, decodeMtMessage } from "../gss/msg/decoder";
import { Message } from "../gss/msg";
import { Readable } from "stream";
import { collectInputStream } from "./utils";
import { logLevelOption } from "./cmd";

const log = logger.create( __filename );

program
  .version( '0.0.3' )
  .description( 'Message decoder for Iridium SBD' )

program.addOption( logLevelOption );

program.addArgument( 
  new Argument( '[file]', 'SBD message file path' ) )

program.addOption( 
  new Option( '--pretty', 'Output will be more human readable' ) )

async function main() {

  program.parse();
  const opts = program.opts();

	logger.setLevel( opts.logLevel );

  // logger.setProgramName( 'decoder' );

  const [ srcFilePath ] = program.args;

  if ( !process.stdout.isTTY ) {
    logger.disableTTY();
  }
  
  let inputStream: Readable;
  
  if ( srcFilePath ) {
    inputStream = fs.createReadStream( srcFilePath );
  } else {
    inputStream = process.stdin;
  }

  collectInputStream( inputStream ).then( buffer => {

    const decoders = [
      decodeMoMessage,
      decodeMtMessage
    ];

    let message: Message | null = null;

    for ( let decoder of decoders ) {
      message = decoder( buffer );
      if ( message ) {
        process.stdout.write(
          Message.toJSON( message, opts.pretty ) + '\n' );
        break;
      }
    }

    if ( message ) {
      log.info( 'Message successfully decoded' );
    } else {
      log.error( 'Decode failed, invalid binary format' );
    }

  }).catch( err => {
    log.error( `Read error => ${ err.message }` );
  })  

}

main();