import { ATInterface } from "./at/interface";

export function computeMsgChecksum( message: Buffer ) {
  let payloadChecksum = 0;
  for ( let i = 0; i < message.length; i++ ) {
    payloadChecksum += message[ i ];
  }
  return ( payloadChecksum & 0xFFFF );
}

/**
 * Checks if the given mobile buffer checksum is valid
 * 
 * @param buffer Full message including trailing checksum
 * @param payloadLength The length of the payload (excluding checksum)
 * @returns Checksum validity
 */
export function validateMsg( message: Buffer, expectedChecksum: number ): boolean {
  return expectedChecksum === computeMsgChecksum( message ); 
}

/**
 * 
 * @param at 
 * @param payloadLength 
 * @returns 
 */
export function readBinMsg( at: ATInterface, payloadLength: number ): Promise<{
  payload: Buffer,
  checksum: number,
}> {
  return at.readBytes( payloadLength + 2, 60000 ).then( buffer => ({
    payload: buffer.subarray( 0, payloadLength ),
    checksum: buffer.readUInt16BE( payloadLength )
  }))
}