import moment from "moment";

import { 
  IE_H_LEN, 
  IE_MO_CONFIRMATION_ID, 
  IE_MO_HEADER_ID, 
  IE_MO_LOCATION_ID, 
  IE_MO_PAYLOAD_ID, 
  IE_MT_CONFIRMATION_ID, 
  IE_MT_HEADER_ID, 
  IE_MT_PAYLOAD_ID, 
  MSG_H_LEN, 
  MSG_REV, 
  Message 
} from "./index";

export function decodeMsgHeader( msg: Message, buf: Buffer ): number {

  const msgRev = buf.readUint8( 0 );
  const msgLength = buf.readUint16BE( 1 );

  const length = buf.length - MSG_H_LEN;

  if ( msgRev === MSG_REV && msgLength === length ) {
    msg.length = msgLength;  
    msg.rev = msgRev;
  } else {
    throw new Error('Invalid message header');
  }

  return MSG_H_LEN;
}

/**
 * 
 * @param msg 
 * @param data 
 * @param offset 
 * @returns The number of bytes read
 */
function decodeMoHeader( msg: Message.MO, data: Buffer, offset: number ): number {

  const header: Required<Message.MO.Header> = {
    id: data.readUint8( offset ),
    length: data.readUint16BE( offset + 1 ),
    cdr: data.readUint32BE( offset + 3 ),
    imei: data.subarray( offset + 7, offset + 22 ).toString( 'ascii' ),
    status: data.readUint8( offset + 22 ),
    momsn: data.readUInt16BE( offset + 23 ),
    mtmsn: data.readUint16BE( offset + 25 ),
    time: moment.unix( data.readUint32BE( offset + 28 ) ),
  };

  msg.header = header;

  // IE header length + IE length
  return IE_H_LEN + header.length;
}

function decodeMoLocation( msg: Message.MO, data: Buffer, offset: number ): number {
  
  const location: Required<Message.MO.Location> = {
    id: data.readUint8( offset ),
    length: data.readUInt16BE( offset + 1 ),
    latitude: 0,
    longitude: 0,
    cepRadius: data.readUint32BE( offset + 10 ),
  }

  const header = data.readUint8( offset + 3 )
  const latDeg =  data.readUint8( offset + 4 )
  const latThoMin = data.readUint16BE( offset + 5 )
  const lonDeg = data.readUint8( offset + 7 )
  const lonThoMin = data.readUint16BE( offset + 8 )

  const ewi = header & 0x1 // north/south indicator
  const nsi = (header >> 1) & 0x1 // east/west indicator

  location.latitude = ( nsi ? -1 : 1 ) * (latDeg + (latThoMin/60000))
  location.longitude = ( ewi ? -1 : 1 ) * (lonDeg + (lonThoMin/60000))

  msg.location = location;

  return IE_H_LEN + location.length;
}

function decodeMoPayload( msg: Message.MO, data: Buffer, offset: number ): number {
  
  const id = data.readUint8( offset ); 
  const length = data.readUInt16BE( offset + 1 );

  const payload: Required<Message.MO.Payload> = {
    id,
    length,
    payload: data.subarray( offset + 3, offset + 3 + length ),
  }

  msg.payload = payload;

  return IE_H_LEN + length;
}

/**
 * Decodes Iridium SBD MO Message
 * 
 * @param buf Message data buffer
 * 
 * @returns Decoded mobile originated message, 
 * in case of failure `null` is returned
 */
export function decodeMoMessage( buf: Buffer ): Message.MO | null {
  
  const msg: Message.MO = {};
  
  try {

    let offset = decodeMsgHeader( msg, buf ); 
 
    for ( ; offset < buf.length; ) {
      
      if ( buf[ offset ] === IE_MO_HEADER_ID ) {
        offset += decodeMoHeader( msg, buf, offset );
      } else if ( buf[ offset ] === IE_MO_PAYLOAD_ID ) {
        offset += decodeMoPayload( msg, buf, offset );
      } else if ( buf[ offset ] === IE_MO_LOCATION_ID ) {
        offset += decodeMoLocation( msg, buf, offset );
      } else if ( buf[ offset ] === IE_MO_CONFIRMATION_ID ) {
        // TODO: ... 
      } else {
        return null;
      }
    }

  } catch ( e ) {
    return null;
  }

  return msg;
}

function decodeMtPayload(
  msg: Message.MT, buffer: Buffer, offset: number
): number {

  const id = buffer.readUint8( offset );
  const length = buffer.readUint16BE( offset + 1 );

  msg.payload = {
    id,
    length,
    payload: buffer.subarray( offset + 3, offset + 3 + length )
  }
  
  // InformationElement  +  MT Payload
  //     3 (bytes)       +  N (bytes) = 3 + N bytes
  return IE_H_LEN + length;
}

function decodeMtHeader( 
  msg: Message.MT, buffer: Buffer, offset: number 
): number {

  const header: Required<Message.MT.Header> = {
    id: buffer.readUint8( offset ),
    length: buffer.readUint16BE( offset + 1 ),
    ucmid: buffer.subarray( offset + 3, offset + 7 ),
    imei: buffer.subarray( offset + 7, offset + 22 ).toString( 'ascii' ),
    flags: buffer.readUint16BE( offset + 22 ),
  } 
  
  msg.header = header;

  // InformationElement  +  MT Header
  //     3 (bytes)       +  21 (bytes) = 24 bytes
  return IE_H_LEN + header.length;
}

function decodeMtConfirmation( 
  msg: Message.MT, buffer: Buffer, offset: number 
): number {

  const confirmation: Required<Message.MT.Confirmation> = {
    id: buffer.readUint8( offset ),
    length: buffer.readUint16BE( offset + 1 ),
    ucmid: buffer.subarray( offset + 3, offset + 7 ),
    imei: buffer.subarray( offset + 7, offset + 22 ).toString( 'ascii' ),
    autoid: buffer.readUint32BE( offset + 22 ),
    status: buffer.readInt16BE( offset + 26 ),
  }
  
  msg.confirmation = confirmation;

  // InformationElement  +  MT Header
  //     3 (bytes)       +  21 (bytes) = 24 bytes
  return IE_H_LEN + confirmation.length;
}

export function decodeMtMessage(
  buf: Buffer,
): Message.MT | null {
  
  const msg: Message.MT = {};
  
  try {
    let offset = decodeMsgHeader( msg, buf ); 
      
    for ( ; offset < buf.length; ) {
      if ( buf[ offset ] === IE_MT_HEADER_ID ) {
        offset += decodeMtHeader( msg, buf, offset );
      } else if ( buf[ offset ] === IE_MT_PAYLOAD_ID ) {
        offset += decodeMtPayload( msg, buf, offset );
      } else if ( buf[ offset ] === IE_MT_CONFIRMATION_ID ) {
        offset+= decodeMtConfirmation( msg, buf, offset );
      } else {
        return null;
      }
    }

  } catch( e ) {
    return null;
  }

  return msg;
}