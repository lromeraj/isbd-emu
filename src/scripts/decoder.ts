#!/usr/bin/node

import fs from "fs-extra";
import colors from "colors";
import logger from "../logger"
import { Argument, Command, Option, program } from "commander";
import { decodeMoMessage, decodeMtMessage } from "../gss/msg/decoder";
import { Message, msgToJSON } from "../gss/msg";

program
  .version( '0.0.3' )
  .description( 'Message decoder for Iridium SBD' )

program.addArgument( 
  new Argument( '[file]', 'SBD message file path' ).argRequired() )

program.addOption( 
  new Option( '--pretty', 'Output will be more human readable' ) )

async function main() {

  program.parse();
  const opts = program.opts();

  const [ filePath ] = program.args;

  if ( !process.stdout.isTTY ) {
    logger.disableTTY();
  }

  if ( fs.pathExistsSync( filePath ) ) {
    
    logger.debug( `Reading ${colors.yellow( filePath )} ...`)
    
    const fileData = fs.readFileSync( filePath );
    
    const decoders = [
      decodeMoMessage, 
      decodeMtMessage
    ];

    let message: Message | null = null;

    for ( let decoder of decoders ) {
      message = decoder( fileData );
      if ( message ) {
        process.stdout.write(
          msgToJSON( message, opts.pretty ) + '\n' );
        break;
      }
    }

    if ( message ) {
      logger.success( 'Message decoded' );
    } else {
      logger.error( 'Decode failed, invalid binary format' );
    }
  
  } else {
    logger.error( `File ${
      colors.yellow( filePath )
    } does not exist` );
  }

}

main();