import moment from "moment";
import { sprintf } from "sprintf-js";
import { ATCmd } from "../at/cmd"
import { ATInterface } from "../at/interface";
import { computeChecksum, Modem, readMB, validateMB } from "./960x";
import { GSS } from "../gss";

/**
 * 5.21 +CGSN – Serial Number
 */
export const CMD_CGSN = ATCmd.wrapContext<Modem>( '+cgsn', cmd => {
  cmd.onExec( async function( at ) {
    at.writeLine( this.imei );
  })
})


/**
 * 5.21 +CGSN – Serial Number
 */
export const CMD_CIER = ATCmd.wrapContext<Modem>( '+cier', cmd => {
  cmd.onSet( /(\d),(\d),(\d)/, async function( at, match ) {

    this.cier.mode = parseInt( match[ 1 ] );
    this.cier.sigind = parseInt( match[ 2 ] );
    this.cier.svcind = parseInt( match[ 3 ] );

    // this actually enqueues events because we are currently
    // processing a command
    this.updateCIEV( this.ciev );
  })
})

export const CMD_SBDMTA = ATCmd.wrapContext<Modem>( '+sbdmta', cmd => {
  cmd.onSet( /\d/, async function( at, match ) {
    this.cier.mode = parseInt( match[ 0 ] );
  })
})
  
/**
 * Transfer mobile terminated originated buffer 
 * to mobile terminated buffer
 */
export const CMD_SBDTC = ATCmd.wrapContext<Modem>( '+sbdtc', cmd => {
  cmd.onExec( async function( at ) {
    this.mtBuffer = { ... this.moBuffer };
    at.writeLine( `SBDTC: Outbound SBD Copied to Inbound SBD: size = ${ 
      this.moBuffer.buffer.length 
    }` )
  })
})


function writeExtSessionResp( 
  this: Modem, at: ATInterface, sessionResp: GSS.SessionResponse 
) {
  
  const resp = sprintf( '%s:%d,%d,%d,%d,%d,%d',
      '+SBDIX',
      sessionResp.mosts, sessionResp.momsn,
      sessionResp.mtsts, sessionResp.mtmsn, sessionResp.mt.length, sessionResp.mtq );

  at.writeLine( resp );
}

/**
 * 5.38 +SBDIX – Short Burst Data: Initiate an SBD Session Extended
 */
export const CMD_SBDIX = ATCmd.wrapContext<Modem>( '+sbdix', cmd => {
  cmd.onExec( async function( at ) {
    return this.initSession({ alert: false }).then( session => {
      writeExtSessionResp.apply( this, [ at, session ] );
    })
  })

})

export const CMD_SBDIXA = ATCmd.wrapContext<Modem>( '+sbdixa', cmd => {
  cmd.onExec( async function( at ) {
    return this.initSession({ alert: true }).then( session => {
      writeExtSessionResp.apply( this, [ at, session ] );
    })
  })
})

/**
 * 5.42 +SBDD – Short Burst Data: Clear SBD Message Buffer(s)
 */
export const CMD_SBDD = ATCmd.wrapContext<Modem>( '+sbdd', cmd => {
  cmd.onExec( /^[012]$/, async function( at, [ opt ] ) {
    
    const code = {
      OK      : '0',
      ERR     : '1',
    }

    if ( opt === '0' ) {
      Modem.clearMobileBuffer( this.moBuffer );
    } else if ( opt === '1' ) {
      Modem.clearMobileBuffer( this.mtBuffer );
    } else if ( opt === '2' ) {
      Modem.clearMobileBuffer( this.moBuffer );
      Modem.clearMobileBuffer( this.mtBuffer );
    }

    at.writeLine( code.OK );

  })

})

// 5.34 +SBDRT – Short Burst Data: Read a Text Message from the Module
// ! Iridium has a mistake in their manual (or in the implementation)
// ! The modem should respond with  +SBDRT:<CR>{MT buffer}
// ! but it is responding with      +SBDRT:<CR><LN>{MT buffer}
export const CMD_SBDRT = ATCmd.wrapContext<Modem>( '+sbdrt', cmd => {
  cmd.onExec( async function ( at ) {
    at.writeLineStart( `${ cmd.name.toUpperCase() }:\r\n` )
    at.writeRaw( this.mtBuffer.buffer )
  })
});

export const CMD_SBDWT = ATCmd.wrapContext<Modem>( '+sbdwt', cmd => {

  cmd.onSet( /.+/, async function( at, [txt] ) {
    
    if ( txt.length > 120 ) {
      return ATCmd.Status.ERR;
    }

    Modem.updateMobileBuffer( 
      this.moBuffer, Buffer.from( txt ) );

  })

  cmd.onExec( async function( at ) {

    const code = {
      OK            : '0',
      ERR_TIMEOUT   : '1',
    }
    
    at.writeLine( 'READY' );

    const delimiter: ATInterface.Delimiter = 
      byte => byte === 0x0D

    return at.readRawUntil( delimiter, 60000 ).then( buffer => {
      Modem.updateMobileBuffer( 
        this.moBuffer, buffer.subarray( 0, -1 ) );
      at.writeLine( code.OK );
    }).catch( err => {
      at.writeLine( code.ERR_TIMEOUT );
    })

  });

})

/**
 * Read mobile terminated buffer
 */
export const CMD_SBDRB = ATCmd.wrapContext<Modem>( '+sbdrb', cmd => {

  cmd.onExec( async function( at ) {
  
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

})

export const CMD_SBDWB = ATCmd.wrapContext<Modem>( '+sbdwb', cmd => {

  cmd.onSet( /\d+/, async function( at, match ) {
    
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
    
      return readMB( at, payloadLength ).then( mobBuf => {

        if ( validateMB( mobBuf ) ) { // message is valid
          
          Modem.updateMobileBuffer( 
            this.moBuffer, mobBuf.buffer, mobBuf.checksum )

          at.writeLine( code.OK );

        } else {
          at.writeLine( code.ERR_CHECKSUM );
        }

      }).catch( err => { // timeout error
        at.writeLine( code.ERR_TIMEOUT );
      })

    }

  })

})