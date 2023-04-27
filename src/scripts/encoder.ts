#!/usr/bin/node

import fs from "fs-extra";
import colors from "colors";
import logger from "../logger"
import { Argument, Command, Option, program } from "commander";
import { Message, msgFromJSON, isMT, isMO } from "../gss/msg";
import { TCPTransport } from "../gss/transport/tcp";
import { encodeMoMsg, encodeMtMessage } from "../gss/msg/encoder";

program
  .version( '0.0.3' )
  .description( 'Message encoder for Iridium SBD' )

program.addArgument( 
  new Argument( '[file]', 'JSON message file' ).argRequired() );


async function main() {

  program.parse();

  const programArgs = program.args;
  const opts = program.opts();

  const [ srcFilePath ] = programArgs;

  if ( !process.stdout.isTTY ) {
    logger.disableTTY();
  }

  await fs.readFile( srcFilePath, 'utf-8' ).then( jsonStr => {

    const msgObj = msgFromJSON( jsonStr );

    if ( isMT( msgObj ) ) {
      
      const mtMsg = msgObj as Message.MT;

      let outFileName = 'MT.sbd';

      if ( mtMsg.header ) {
        outFileName = `MT_${ 
          mtMsg.header.imei 
        }_${ 
          mtMsg.header.ucmid.toString( 'hex' ).toUpperCase()
        }.sbd`
      } else if ( mtMsg.confirmation ) {
        outFileName = `MTC_${
          mtMsg.confirmation.imei
        }_${
          mtMsg.confirmation.autoid
        }.sbd`
      }
      
      const encodedBuffer = encodeMtMessage( mtMsg );

      if ( process.stdout.isTTY ) {

        return fs.writeFile( outFileName, encodedBuffer ).then( () => {
          logger.success( `MT message written to ${ colors.green( outFileName ) }` );
        }).catch( err => {
          logger.error( `Could not write MT message ${ 
            colors.red( outFileName ) 
          } => ${ err.message }` );
        })

      } else {
        process.stdout.write( encodedBuffer );
        logger.success( `MT message encoded` );
      }
    
    } else if ( isMO( msgObj ) ) {
      const moMsg = msgObj as Message.MO;
      logger.warn( `Can't encode MO messages by the moment` );
    } else {
      logger.error( `Invalid JSON, could not recognize message type` );
    }

  }).catch( err => {
    logger.error( `Encode failed => ${ err.message }` )
  })
  
}



main();