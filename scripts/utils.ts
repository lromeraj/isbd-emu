import { Readable } from "stream";

export function collectInputStream( inputStream: Readable ) {
  
  return new Promise<Buffer>( (resolve, reject) => {
    
    const chunks: Buffer[] = [];
  
    inputStream.on( 'error', err => {
      reject( err );
    })
  
    inputStream.on( 'data', chunk =>  {
      chunks.push( chunk );
    })
  
    inputStream.on( 'end', () => {
      resolve( Buffer.concat( chunks ) );
    });

  });

}