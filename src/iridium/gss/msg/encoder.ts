import { Message } from ".";

function encodeMoHeader( msg: Message.MO.Header ): Buffer {
    
  const IE_ID = 0x01;
  const IE_LEN = 28;

  const buffer = Buffer.alloc( 3 + IE_LEN );

  let offset = 0;
  offset = buffer.writeUint8( IE_ID, offset );
  offset = buffer.writeUint16BE( IE_LEN, offset );
  offset = buffer.writeUint32BE( msg.cdr, offset );
  offset += buffer.write( msg.imei, offset, 15, 'ascii' );
  offset = buffer.writeUint8( msg.status, offset );
  offset = buffer.writeUint16BE( msg.momsn, offset );
  offset = buffer.writeUint16BE( msg.mtmsn, offset );
  offset = buffer.writeUint32BE( msg.time.unix(), offset );

  return buffer;
}

function encodeMoPayload( msg: Message.MO.Payload ): Buffer {

  const IE_ID = 0x02;
  const IE_LEN = msg.payload.length;

  const buffer = Buffer.alloc( 3 + IE_LEN );
  
  let offset = 0;
  offset = buffer.writeUInt8( IE_ID, offset );
  offset = buffer.writeUint16BE( IE_LEN, offset );
  offset += msg.payload.copy( buffer, offset );

  return buffer;
}

function encodeMoMsgLocation( 
  msg: Message.MO.Location 
): Buffer {

  const IE_ID = 0x03;
  const IE_LEN = 11;

  const buffer = Buffer.alloc( 3 + IE_LEN );
  
  const nsi = Number( msg.latitude < 0 ) << 1
  const ewi = Number( msg.longitude < 0 )
  
  const latDeg = Math.abs( Math.trunc( msg.latitude ) )
  const lonDeg = Math.abs( Math.trunc( msg.longitude ) )

  let latThoMin = Math.abs( msg.latitude ) % 1 
  let lonThoMin = Math.abs( msg.longitude ) % 1 
  
  latThoMin = Math.round( latThoMin * 60000 )
  lonThoMin = Math.round( lonThoMin * 60000 )

  let offset = 0;
  offset = buffer.writeUint8( IE_ID, offset );
  offset = buffer.writeUint16BE( IE_LEN, offset );
  offset = buffer.writeUint8( nsi | ewi, offset );
  offset = buffer.writeUint8( latDeg, offset );
  offset = buffer.writeUint16BE( latThoMin, offset );
  offset = buffer.writeUint8( lonDeg, offset );
  offset = buffer.writeUint16BE( lonThoMin, offset );
  offset = buffer.writeUint32BE( msg.cepRadius, offset );

  return buffer;
}

export function encodeMoMsg( 
  msg: Message.MO & { // make message values mandatory
    payload: Message.MO.Payload,
    header: Message.MO.Header,
    location: Message.MO.Location,
  }
): Buffer {
  
  const protoHeaderBuf = Buffer.alloc( 3 );

  const headerBuf = encodeMoHeader( msg.header );
  const locationBuf = encodeMoMsgLocation( msg.location );
  const payloadBuf = encodeMoPayload( msg.payload );

  let offset = 0;
  offset = protoHeaderBuf.writeUint8( 0x01, offset );
  offset = protoHeaderBuf.writeUint16BE(
    headerBuf.length + locationBuf.length + payloadBuf.length, offset );

  return Buffer.concat([ 
    protoHeaderBuf, headerBuf, locationBuf, payloadBuf ]);

}


