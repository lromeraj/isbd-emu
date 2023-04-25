#!/usr/bin/node

import fs from "fs-extra";
import colors from "colors";
import logger from "../logger"
import { Argument, Command, Option, program } from "commander";
import { decodeMoMessage, decodeMtMessage } from "../gss/msg/decoder";
import { Message } from "../gss/msg";

program
  .version( '0.0.3' )
  .description( 'Message decoder for Iridium SBD' )

program.addArgument( 
  new Argument( '[file]', 'SBD Direct IP message file path' ).argRequired() )

async function main() {
  program.parse();

  const programArgs = program.args;

  const [ filePath ] = programArgs;

  if ( fs.pathExistsSync( filePath ) ) {
    
    logger.debug( `Reading ${colors.yellow( filePath )} ...`)
    
    const fileData = fs.readFileSync( filePath );
    
    const decoders: (( buf: Buffer ) => Message | null)[] = [
      decodeMoMessage, decodeMtMessage
    ];
    let message: Message | null = null; 
    for ( let decoder of decoders ) {
      message = decoder( fileData );
      if ( message ) {
        console.log( message );
        break;
      }
    }

    if ( message ) {
      logger.success( 'Message decoded' );
    } else {
      logger.error( 'Decode failed, invalid binary format' );
    }

  
  } else {
    logger.error( `File ${colors.yellow( filePath )} does not exist`)
  }

}

main();