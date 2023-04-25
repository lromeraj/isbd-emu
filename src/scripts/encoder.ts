#!/usr/bin/node

import fs from "fs-extra";
import colors from "colors";
import logger from "../logger"
import { Argument, Command, Option, program } from "commander";
import { Message } from "../gss/msg";
import { TCPTransport } from "../gss/transport/tcp";
import { decodeMoMessage, decodeMtMessage } from "../gss/msg/decoder";
import { encodeMoMsg, encodeMtMessage } from "../gss/msg/encoder";

program
  .version( '0.0.3' )
  .description( 'Message encoder for Iridium SBD' )


program.addArgument( 
  new Argument( '[file]', 'JSON message file' ).argRequired() );

program.addOption(
  new Option( '--tcp-host <string>', 'TCP transport host' ) )

program.addOption(
  new Option( '--tcp-port <number>', 'TCP transport port' )
    .default( 10800 ).argParser( v => parseInt( v ) ) )


function sendMtMessage( transport: TCPTransport, buffer: Buffer ) {

  logger.info( `Sending MT message ...` );

  return transport.sendBuffer( buffer ).then( mtBuf => {

    const mtMsg = decodeMtMessage( mtBuf );

    if ( mtMsg ) {

      const outFileName = `MT_${ 
        mtMsg.confirmation?.imei 
      }_${ 
        mtMsg.confirmation?.autoid 
      }.sbd`
      
      return fs.writeFile( outFileName, mtBuf ).then( () => {
        logger.success( `MT confirmation message written into ${ 
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

  await fs.readFile( srcFilePath, 'utf-8' ).then( buffer => {
    return JSON.parse( buffer );
  }).then( jsonMsg => {

    if ( jsonMsg 
      && jsonMsg.header 
      && jsonMsg.header.ucmid
      && jsonMsg.header.imei ) {
      
      const mtMsgHeader = jsonMsg.header as Message.MT.Header;

      mtMsgHeader.ucmid = Buffer.from( mtMsgHeader.ucmid );
    
      if ( jsonMsg.payload.payload ) {
        jsonMsg.payload.payload = Buffer.from( jsonMsg.payload.payload );
      }
      
      const encodedBuffer = encodeMtMessage( jsonMsg );
      
      const outFileName = `MT_${ 
        mtMsgHeader.imei 
      }_${ 
        mtMsgHeader.ucmid.toString( 'hex' ).toUpperCase()
      }.sbd`

      return fs.writeFile( outFileName, encodedBuffer ).then( () => {
        logger.success( `MT message written to ${ colors.green( outFileName ) }` );
      }).catch( err => {
        logger.error( `Could not write MT message ${ 
          colors.red( outFileName ) 
        } => ${ err.message }` );
      }).finally(() => {

        if ( opts.tcpHost && opts.tcpPort ) {
          const transport = new TCPTransport({
            host: opts.tcpHost,
            port: opts.tcpPort,
          })

          return sendMtMessage( transport, encodedBuffer );
        }

      })




    }

  })
  
}



main();