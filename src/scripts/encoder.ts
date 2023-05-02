#!/usr/bin/node

import fs from "fs-extra";
import colors from "colors";
import * as logger from "../logger"
import { Argument, Command, Option, program } from "commander";
import { Message, msgFromJSON, isMT, isMO } from "../gss/msg";
import { TCPTransport } from "../gss/transport/tcp";
import { encodeMoMsg, encodeMtMessage } from "../gss/msg/encoder";
import { Readable } from "stream";
import { collectInputStream } from "./utils";

const log = logger.create( 'main' );

program
  .version( '0.0.3' )
  .description( 'Message encoder for Iridium SBD' )

program.addArgument( 
  new Argument( '[file]', 'JSON message file' ) );

function processMtMessage( mtMsg: Message.MT ) {
  
  const encodedBuffer = encodeMtMessage( mtMsg );

  if ( process.stdout.isTTY ) {

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

    return fs.writeFile( outFileName, encodedBuffer ).then( () => {
      log.success( `MT message written to ${ colors.green( outFileName ) }` );
    }).catch( err => {
      log.error( `Could not write MT message ${ 
        colors.red( outFileName ) 
      } => ${ err.message }` );
    })

  } else {
    process.stdout.write( encodedBuffer );
    log.success( `MT message encoded` );
  }

}


function processMoMessage( moMsg: Message.MO ) {
  
  const encodedBuffer = encodeMoMsg( moMsg );

  if ( process.stdout.isTTY ) {

    let outFileName = 'MO.sbd';

    if ( moMsg.header ) {
      outFileName = `MO_${ 
        moMsg.header.imei 
      }_${ 
        moMsg.header.momsn.toString().padStart( 6, '0' )
      }.sbd`
    }

    return fs.writeFile( outFileName, encodedBuffer ).then( () => {
      
      log.success( `MO message written to ${ 
        colors.green( outFileName ) 
      }` );

    }).catch( err => {
      log.error( `Could not write MO message ${ 
        colors.red( outFileName ) 
      } => ${ err.message }` );
    })

  } else {
    process.stdout.write( encodedBuffer );
    log.success( `MO message encoded` );
  }

}

async function main() {

  program.parse();

  logger.setProgramName( 'encoder' );
  
  if ( !process.stdout.isTTY ) {
    logger.disableTTY();
  }
  
  let inputStream: Readable;
  const [ srcFilePath ] = program.args;
  
  if ( srcFilePath ) {
    inputStream = fs.createReadStream( srcFilePath );
  } else if ( !process.stdin.isTTY ) {
    inputStream = process.stdin;
  } else {
    log.error( `Encode failed, input is empty` );
    process.exit( 1 );
  }

  collectInputStream( inputStream ).then( jsonBuffer => {

    const msgObj = msgFromJSON( jsonBuffer.toString() );

    if ( isMT( msgObj ) ) {
      processMtMessage( msgObj as Message.MT );
    } else if ( isMO( msgObj ) ) {
      processMoMessage( msgObj as Message.MO );
    } else {
      log.error( `Invalid JSON, could not recognize message type` );
    }

  }).catch( err => {
    log.error( `Read error => ${ err.message }` );
  })

}



main();