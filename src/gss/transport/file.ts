import fs from "fs-extra";
import { Transport } from ".";


export class FileTransport extends Transport {

  private options: FileTransport.Options;
  private readonly READ_TIMEOUT = 5000;

  constructor( options: FileTransport.Options ) {
    super();
    this.options = options;
  }

  async sendBuffer( buffer: Buffer ): Promise<Buffer> {
    // const writeStream = fs.createWriteStream( this.options.path );
    return fs.writeFile( this.options.path, buffer ).then( () => {
      return Buffer.from([]);
    })
  }

  async sendSessionMessage(
    msg: Transport.SessionMessage
  ): Promise<Transport.SessionMessage> {
      return msg;
  }

}

export namespace FileTransport {
  export interface Options {
    path: string;
  }
}