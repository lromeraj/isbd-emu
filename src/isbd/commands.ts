import { ATCmd } from "../at/cmd"
import { Modem, readMB, validateMB } from "./modem";

export const CMD_CGSN = new ATCmd<Modem>( '+cgsn' )
  .onExec( null, async function( at ) {
    at.writeLine( this.imei );
  })

/**
 * Transfer mobile terminated originated buffer 
 * to mobile terminated buffer
 */
export const CMD_SBDTC = new ATCmd<Modem>( '+sbdtc' )
  .onExec( null, async function( modem ) {
    this.mtBuffer = { ... this.moBuffer };
  })

/**
 * Read mobile terminated buffer
 */
export const CMD_SBDRB = new ATCmd<Modem>( '+sbdrb' )
  .onExec( null, async function( at ) {
    
    let offset = 0;

    const mtBuf = this.mtBuffer;

    // LENGTH (2 bytes) + MESSAGE (LENGTH bytes) + CHECKSUM (2 bytes)
    const totalLength = 2 + mtBuf.buffer.length + 2;

    const buffer = Buffer.alloc( totalLength );

    offset = buffer.writeUint16BE( 
      mtBuf.buffer.length, offset );
    
    // copy() do not returns an offset, returns the
    // number of bytes copied instead
    offset += mtBuf.buffer.copy( 
      buffer, offset );
    
    offset = buffer.writeUInt16BE( 
      mtBuf.checksum, offset );

    at.writeRaw( buffer );

  })

export const CMD_SBDWB = new ATCmd<Modem>( '+sbdwb' )
  .onSet( /\d+/, async function( at, match ) {
    
    const code = {
      OK            : '0', // everything was ok
      ERR_TIMEOUT   : '1', // data took too much time to arrive
      ERR_CHECKSUM  : '2', // received checksum is not valid
      ERR_LENGTH    : '3', // message length is out of bounds [1, 340]
    };
    
    const payloadLength = parseInt( match[ 0 ] )

    if ( payloadLength < 1 || payloadLength > 340 ) {
      at.writeLine( code.ERR_LENGTH );
    } else {

      at.writeLine( 'READY' );
    
      return readMB( at, payloadLength )

        .then( mobBuf => {

        if ( validateMB( mobBuf ) ) { // message is valid
          
          this.moBuffer = {
            ... mobBuf
          };

          at.writeLine( code.OK );

        } else {
          at.writeLine( code.ERR_CHECKSUM );
        }

      }).catch( err => { // timeout error
        at.writeLine( code.ERR_TIMEOUT );
      })

    }

  })