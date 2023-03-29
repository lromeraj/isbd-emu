import { ATInterface } from "./at";

/**
 * Checks if the given mobile buffer checksum is valid
 * 
 * @param buffer Full message including trailing checksum
 * @param payloadLength The length of the payload (excluding checksum)
 * @returns Checksum validity
 */
export function checkMBCS( payload: Buffer, expectedChecksum: number ): boolean {
  let payloadChecksum = 0;
  for ( let i = 0; i < payload.length; i++ ) {
    payloadChecksum += payload[ i ];
  }
  return expectedChecksum === ( payloadChecksum & 0xFFFF ); 
}

/**
 * 
 * @param at 
 * @param payloadLength 
 * @returns 
 */
export function readMB( at: ATInterface, payloadLength: number ): Promise<{
  payload: Buffer,
  checksum: number,
}> {
  return at.readBytes( payloadLength + 2, 60000 ).then( buffer => ({
    payload: buffer.subarray( 0, payloadLength ),
    checksum: buffer.readUInt16BE( payloadLength )
  }))
}