import { IE_H_LEN, IE_MO_HEADER_ID, IE_MO_HEADER_LEN, IE_MO_LOCATION_ID, IE_MO_LOCATION_LEN, IE_MO_PAYLOAD_ID, MSG_H_LEN, MSG_REV, Message } from ".";

function encodeMsg( payload: Buffer[] ): Buffer {
  
  let offset = 0;
  const msgHeaderBuf = Buffer.alloc( MSG_H_LEN );
  const msgPayloadLength = payload.reduce( 
    ( prev, cur ) => prev + cur.length, 0 );

  offset = msgHeaderBuf.writeUint8( MSG_REV, offset );
  offset = msgHeaderBuf.writeUint16BE( msgPayloadLength, offset );

  return Buffer.concat([ msgHeaderBuf, ... payload ]);
}

function encodeMoHeader( msg: Message.MO.Header ): Buffer {
    
  const buffer = Buffer.alloc( IE_H_LEN + IE_MO_HEADER_LEN );

  let offset = 0;
  offset = buffer.writeUint8( IE_MO_HEADER_ID, offset );
  offset = buffer.writeUint16BE( IE_MO_HEADER_LEN, offset );
  offset = buffer.writeUint32BE( msg.cdr, offset );
  offset += buffer.write( msg.imei, offset, 15, 'ascii' );
  offset = buffer.writeUint8( msg.status, offset );
  offset = buffer.writeUint16BE( msg.momsn, offset );
  offset = buffer.writeUint16BE( msg.mtmsn, offset );
  offset = buffer.writeUint32BE( msg.time.unix(), offset );

  return buffer;
}

function encodeMoPayload( msg: Message.MO.Payload ): Buffer {

  const buffer = Buffer.alloc( IE_H_LEN + msg.payload.length );
  
  let offset = 0;
  offset = buffer.writeUInt8( IE_MO_PAYLOAD_ID, offset );
  offset = buffer.writeUint16BE( msg.payload.length, offset );
  offset += msg.payload.copy( buffer, offset );

  return buffer;
}

function encodeMoLocation( 
  msg: Message.MO.Location 
): Buffer {

  const buffer = Buffer.alloc( IE_H_LEN + IE_MO_LOCATION_LEN );
  
  const nsi = Number( msg.latitude < 0 ) << 1
  const ewi = Number( msg.longitude < 0 )
  
  const latDeg = Math.abs( Math.trunc( msg.latitude ) )
  const lonDeg = Math.abs( Math.trunc( msg.longitude ) )

  let latThoMin = Math.abs( msg.latitude ) % 1 
  let lonThoMin = Math.abs( msg.longitude ) % 1 
  
  latThoMin = Math.round( latThoMin * 60000 )
  lonThoMin = Math.round( lonThoMin * 60000 )

  let offset = 0;
  offset = buffer.writeUint8( IE_MO_LOCATION_ID, offset );
  offset = buffer.writeUint16BE( IE_MO_LOCATION_LEN, offset );
  offset = buffer.writeUint8( nsi | ewi, offset );
  offset = buffer.writeUint8( latDeg, offset );
  offset = buffer.writeUint16BE( latThoMin, offset );
  offset = buffer.writeUint8( lonDeg, offset );
  offset = buffer.writeUint16BE( lonThoMin, offset );
  offset = buffer.writeUint32BE( msg.cepRadius, offset );

  return buffer;
}

export function encodeMoMsg( 
  msg: Message.MO
): Buffer {
  
  let payload: Buffer[] = [] 

  if ( msg.header ) {
    payload.push( 
      encodeMoHeader( msg.header ) );
  }

  if ( msg.location ) {
    payload.push( 
      encodeMoLocation( msg.location ) );
  }

  if ( msg.payload ) {
    payload.push( 
      encodeMoPayload( msg.payload ) );
  }

  if ( msg.confirmation ) {
    // TODO: ...
  }

  return encodeMsg( payload );
}

function encodeMtPayload( msg: Message.MT.Payload ): Buffer {
  return Buffer.from([])
}

function encodeMtHeader( msg: Message.MT.Header ): Buffer {
  return Buffer.from([])
}

function encodeMtConfirmation( msg: Message.MT.Confirmation ): Buffer {
  return Buffer.from([])
}

export function encodeMtMessage(
  msg: Message.MT
) {

  const payload: Buffer[] = []

  if ( msg.header ) {
    payload.push( 
      encodeMtHeader( msg.header ) );
  }

  if ( msg.payload ) {
    payload.push( 
      encodeMtPayload( msg.payload ) );
  }
  
  if ( msg.confirmation ) {
    // TODO: ...
  }
  
  return encodeMsg( payload );
}

