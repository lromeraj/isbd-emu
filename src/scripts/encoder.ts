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
    .default( 10801 ).argParser( v => parseInt( v ) ) )

async function main() {
  program.parse();

  const programArgs = program.args;
  const opts = program.opts();

  const [ srcFilePath ] = programArgs;

  let message: Message | null = null;
  let encoder: ((msg: Message) => Buffer) | null = null;

  if ( fs.pathExistsSync( srcFilePath ) ) {
    
    logger.info( `Reading ${
      colors.yellow( srcFilePath )
    } ...`)

    const strJsonMsg = fs.readFileSync( srcFilePath, 'utf-8' );
    const jsonMsg = JSON.parse( strJsonMsg );
  
    if ( jsonMsg 
      && jsonMsg.header 
      && jsonMsg.header.ucmid
      && jsonMsg.header.imei ) {
      
      jsonMsg.header.ucmid = Buffer.from( jsonMsg.header.ucmid );

      if ( jsonMsg.payload.payload ) {
        jsonMsg.payload.payload = Buffer.from( jsonMsg.payload.payload );
      }
      
      message = jsonMsg;
      encoder = encodeMtMessage;
    }
   
  } else {
    
    logger.error( `File ${
      colors.yellow( srcFilePath )
    } does not exist` )

    process.exit( 1 );
  }

  if ( message && encoder ) {
  
    if ( opts.tcpHost && opts.tcpPort ) {
      
      const transport = new TCPTransport({
        host: opts.tcpHost,
        port: opts.tcpPort,
      })
  
      transport.sendMessage( message, encoder ).then( data => {
        // logger.success( 'Message sent', data );
        logger.debug( `Decoding confirmation ... `, decodeMtMessage( data ) );
      }).catch( err => {
        logger.error( `Could not send message => ${ err.message }` );
      })
  
    } else {
      const outFilePath = `out.bin`
      fs.writeFileSync( outFilePath, encoder( message ) );
      logger.success( `Data written to ${ colors.green( outFilePath ) }` )
    }

  } else {
    logger.error( `Encode failed, please check your input` );
  }
  
}

main();