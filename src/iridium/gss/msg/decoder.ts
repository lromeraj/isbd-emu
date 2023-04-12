import moment from "moment";
import { MO_IE_HEADER_ID, MO_IE_LOCATION_ID, MO_IE_PAYLOAD_ID, MT_IE_HEADER_ID, MT_IE_PAYLOAD_ID, Message } from "./index";

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
  return 3 + header.length;
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

  return 3 + location.length;
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

  return 3 + length;
}

/**
 * Decodes Iridium SBD MO Message
 * 
 * @param data Message data buffer
 * 
 * @returns Decoded mobile originated message, 
 * in case of failure `null` is returned
 */
export function decodeMoMessage( data: Buffer ): Required<Message.MO> | null {
  
  const protoRevision = data.readUint8( 0 );
  const overallLength = data.readUint16BE( 1 );
  
  const msg: Message.MO = {
    protoRev: protoRevision,
    length: overallLength,
  };
  
  let offset: number = 3;
 
  for ( ; offset < data.length; ) {
    
    if ( data[ offset ] === MO_IE_HEADER_ID ) {
      offset += decodeMoHeader( msg, data, offset );
    } else if ( data[ offset ] === MO_IE_PAYLOAD_ID ) {
      offset += decodeMoPayload( msg, data, offset );
    } else if ( data[ offset ] === MO_IE_LOCATION_ID ) {
      offset += decodeMoLocation( msg, data, offset );
    } else {
      return null;
    }

  }

  return msg as Required<Message.MO>;
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
  return 3 + length;
}

function decodeMtHeader( 
  msg: Message.MT, buffer: Buffer, offset: number 
): number {

  msg.header = {
    id: buffer.readUint8( offset ),
    length: buffer.readUint16BE( offset + 1 ),
    ucmid: buffer.subarray( offset + 3, offset + 7 ),
    imei: buffer.subarray( offset + 7, offset + 22 ).toString( 'ascii' ),
    flags: buffer.readUint16BE( offset + 22 ),
  }
  
  // InformationElement  +  MT Header
  //     3 (bytes)       +  21 (bytes) = 24 bytes
  return 24;
}

export function decodeMtMessage(
  buf: Buffer,
): Required<Message.MT> | null {
  
  const protoRev = buf.readUint8( 0 );
  const length = buf.readUint16BE( 1 );
  
  const msg: Message.MT = {
    length,
    protoRev,
  };
  
  let offset: number = 3;
  
  for ( ; offset < buf.length; ) {
    if ( buf[ offset ] === MT_IE_HEADER_ID ) {
      offset += decodeMtHeader( msg, buf, offset );
    } else if ( buf[ offset ] === MT_IE_PAYLOAD_ID ) {
      offset += decodeMtPayload( msg, buf, offset );
    } else {
      return null;
    }
  }

  return msg as Required<Message.MT>;
}